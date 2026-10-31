import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs/promises';
import type { ExodraCompileOptions } from 'babel-preset-exodra';
import { transformExodraJsx } from './transformExodraJsx';

export interface TExoVitePluginOptions extends ExodraCompileOptions {
    /**
     * Root directory for pages
     * @default 'src/pages'
     */
    pagesDir?: string;

    /**
     * Root directory for API routes
     * @default 'src/api'
     */
    apiDir?: string;

    // No `filter`/`include`: what gets transformed is decided from Vite's module id.
}

export default function exodraPlugin(options: TExoVitePluginOptions = {}): Plugin {
    const { pagesDir = 'src/pages', apiDir = 'src/api', schemaSource } = options;

    let server: ViteDevServer;
    let routeManifest: Map<string, RouteInfo | string> = new Map();

    return {
        name: 'vite-plugin-exodra',
        // Run before Vite's built-in esbuild transform so we own the JSX pipeline.
        enforce: 'pre',

        config() {
            return {
                esbuild: {
                    // esbuild would lower each element to a runtime call and throw on the
                    // namespaced directives, so it must be told to leave JSX alone.
                    jsx: 'preserve' as const,
                },
            };
        },

        configureServer(_server) {
            server = _server;

            server.watcher.add(path.resolve(pagesDir));
            server.watcher.add(path.resolve(apiDir));

            server.middlewares.use(async (req, res, next) => {
                if (!req.url?.startsWith('/api/')) {
                    return next();
                }

                const apiPath = req.url.replace('/api/', '');
                const apiFile = path.join(process.cwd(), apiDir, `${apiPath}.ts`);

                try {
                    await fs.access(apiFile);
                    const module = await server.ssrLoadModule(apiFile);

                    const method = req.method?.toUpperCase() || 'GET';
                    const handler = module[method] || module.default;

                    if (!handler) {
                        res.statusCode = 405;
                        res.end('Method not allowed');
                        return;
                    }

                    const request = createRequest(req);
                    const response = await handler(request);

                    sendResponse(res, response);
                } catch (error) {
                    next();
                }
            });

            return () => {
                server.middlewares.use(async (req, res, next) => {
                    if (req.url?.startsWith('/@') || req.url?.endsWith('.hot-update.json')) {
                        return next();
                    }

                    if (!req.url?.includes('.')) {
                        req.url = '/index.html';
                    }

                    next();
                });
            };
        },

        async transform(code, id) {
            if (id.includes('node_modules')) return null;
            if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) return null;

            const transformed = await transformExodraJsx(code, id, { schemaSource });
            const outCode = transformed?.code ?? code;
            const map = transformed?.map ?? null;

            // No `import.meta.hot` glue is appended, deliberately: a module that accepts a hot
            // update stops Vite propagating to its importer. README, Hot Module Replacement.
            return { code: outCode, map };
        },

        async buildStart() {
            routeManifest = await generateRoutes(pagesDir);

            this.emitFile({
                type: 'chunk',
                id: 'virtual:exodra-routes',
                fileName: 'routes.js',
                preserveSignature: false,
            });
        },

        resolveId(id) {
            if (id === 'virtual:exodra-routes') {
                return '\0virtual:exodra-routes';
            }
        },

        async load(id) {
            if (id === '\0virtual:exodra-routes') {
                const routes: string[] = [];

                for (const [route, info] of routeManifest) {
                    const routeInfo = typeof info === 'string' ? { file: info } : info;

                    let routeConfig = `{\n    path: '${route}'`;

                    if (routeInfo.catchAll) {
                        routeConfig += `,\n    catchAll: '${routeInfo.catchAll}'`;
                    }
                    if (routeInfo.optionalCatchAll) {
                        routeConfig += `,\n    optionalCatchAll: '${routeInfo.optionalCatchAll}'`;
                    }

                    routeConfig += `,\n    component: exoLazy(() => import('${routeInfo.file}'))\n  }`;
                    routes.push(routeConfig);
                }

                return `
import { exoLazy } from '@exodra/router';

export const routes = [
  ${routes.join(',\n  ')}
];
`;
            }
        },
    };
}

interface RouteInfo {
    file: string;
    catchAll?: string;
    optionalCatchAll?: string;
}

async function generateRoutes(pagesDir: string): Promise<Map<string, RouteInfo | string>> {
    const routes = new Map<string, RouteInfo | string>();
    const baseDir = path.resolve(pagesDir);

    async function scanDir(dir: string, basePath: string = '') {
        try {
            const files = await fs.readdir(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = await fs.stat(filePath);

                if (stat.isDirectory()) {
                    await scanDir(filePath, path.join(basePath, file));
                } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                    const name = file.replace(/\.(tsx|jsx)$/, '');

                    if (name.startsWith('_')) {
                        continue;
                    }

                    let route = basePath;

                    if (name === 'index') {
                        route = basePath || '/';
                    } else if (name.startsWith('[...') && name.endsWith(']')) {
                        const param = name.slice(4, -1);
                        route = path.join(basePath, `*`);
                        routes.set(route.startsWith('/') ? route : `/${route}`, {
                            file: filePath,
                            catchAll: param,
                        });
                        continue;
                    } else if (name.startsWith('[[...') && name.endsWith(']]')) {
                        const param = name.slice(5, -2);
                        // Optional: the file gets both the bare route and the catch-all.
                        route = basePath || '/';
                        routes.set(route.startsWith('/') ? route : `/${route}`, {
                            file: filePath,
                            optionalCatchAll: param,
                        });
                        route = path.join(basePath, `*`);
                        routes.set(route.startsWith('/') ? route : `/${route}`, {
                            file: filePath,
                            optionalCatchAll: param,
                        });
                        continue;
                    } else if (name.startsWith('[') && name.endsWith(']')) {
                        const param = name.slice(1, -1);
                        route = path.join(basePath, `:${param}`);
                    } else {
                        route = path.join(basePath, name);
                    }

                    routes.set(route.startsWith('/') ? route : `/${route}`, { file: filePath });
                }
            }
        } catch (error) {
            // A missing pagesDir/apiDir is normal: it yields no routes rather than an error.
        }
    }

    await scanDir(baseDir);
    return routes;
}

function createRequest(req: IncomingMessage): Request {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
        if (value) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
    });

    return new Request(url, {
        method: req.method,
        headers,
        // No body is forwarded: an API handler cannot read the request payload.
    });
}

async function sendResponse(res: ServerResponse, response: Response) {
    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
        res.setHeader(key, value);
    });

    const body = await response.text();
    res.end(body);
}
