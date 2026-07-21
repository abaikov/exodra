import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs/promises';
import { transformExodraJsx } from './transformExodraJsx';

export interface ExodraPluginOptions {
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
  
  /**
   * Enable SSR mode
   * @default false
   */
  ssr?: boolean;
  
  /**
   * Import alias
   * @default '@'
   */
  alias?: string;
}

/**
 * Vite plugin for Exodra development
 * Provides:
 * - HMR for components
 * - File-based routing
 * - API routes handling
 * - SSR support
 */
export default function exodraPlugin(options: ExodraPluginOptions = {}): Plugin {
  const {
    pagesDir = 'src/pages',
    apiDir = 'src/api'
  } = options;
  
  let server: ViteDevServer;
  let routeManifest: Map<string, RouteInfo | string> = new Map();
  
  return {
    name: 'vite-plugin-exodra',
    // Run before Vite's built-in esbuild transform so we own the JSX pipeline.
    enforce: 'pre',

    config() {
      return {
        esbuild: {
          // Exodra JSX is compiled by @exodra/babel-plugin-jsx (see transform()),
          // not by esbuild's classic jsxFactory — that mode is incompatible with
          // Exodra's three-props h(type, attrs, cacheKey) signature. Tell esbuild
          // to leave JSX alone so it never injects a foreign jsx runtime.
          jsx: 'preserve' as const
        }
      };
    },

    configureServer(_server) {
      server = _server;
      
      // Watch for page changes
      server.watcher.add(path.resolve(pagesDir));
      server.watcher.add(path.resolve(apiDir));
      
      // Handle API routes
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }
        
        const apiPath = req.url.replace('/api/', '');
        const apiFile = path.join(process.cwd(), apiDir, `${apiPath}.ts`);
        
        try {
          await fs.access(apiFile);
          const module = await server.ssrLoadModule(apiFile);
          
          // Handle different HTTP methods
          const method = req.method?.toUpperCase() || 'GET';
          const handler = module[method] || module.default;
          
          if (!handler) {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }
          
          // Create Request/Response objects
          const request = createRequest(req);
          const response = await handler(request);
          
          // Send response
          sendResponse(res, response);
        } catch (error) {
          // API route not found, continue to next middleware
          next();
        }
      });
      
      return () => {
        // Custom middleware for Exodra routing
        server.middlewares.use(async (req, res, next) => {
          // Skip for HMR and Vite internal requests
          if (req.url?.startsWith('/@') || req.url?.endsWith('.hot-update.json')) {
            return next();
          }
          
          // Handle SPA routing
          if (!req.url?.includes('.')) {
            req.url = '/index.html';
          }
          
          next();
        });
      };
    },
    
    async handleHotUpdate({ file, server, modules }) {
      // Custom HMR for Exodra components
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        // Find component boundaries
        const componentModules = Array.from(modules).filter(mod => 
          mod.id && (mod.id.endsWith('.tsx') || mod.id.endsWith('.jsx'))
        );
        
        // Preserve component state if possible
        componentModules.forEach(mod => {
          server.ws.send({
            type: 'custom',
            event: 'exodra:component-update',
            data: {
              id: mod.id,
              url: mod.url,
              preserveState: true
            }
          });
        });
        
        return componentModules;
      }
      
      // Reload router on page changes
      if (file.includes(pagesDir)) {
        server.ws.send({
          type: 'custom',
          event: 'exodra:route-update',
          data: {
            file: file,
            routes: await generateRoutes(pagesDir)
          }
        });
        
        return [];
      }
      
      return modules;
    },
    
    async transform(code, id) {
      if (id.includes('node_modules')) return null;
      if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) return null;

      // Compile Exodra JSX -> h() via @exodra/babel-plugin-jsx (the only correct
      // transform). This runs `enforce: 'pre'`, so the output is plain JS by the
      // time Vite's esbuild sees it.
      const transformed = await transformExodraJsx(code, id);
      let outCode = transformed?.code ?? code;
      const map = transformed?.map ?? null;

      // Append Exodra HMR glue once.
      if (!outCode.includes('import.meta.hot')) {
        outCode += `
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // Exodra HMR logic
    if (newModule) {
      window.__EXODRA_HMR__?.updateComponent(${JSON.stringify(id)}, newModule);
    }
  });
}`;
      }

      return { code: outCode, map };
    },
    
    async buildStart() {
      // Generate initial route manifest
      routeManifest = await generateRoutes(pagesDir);
      
      // Create virtual route module
      this.emitFile({
        type: 'chunk',
        id: 'virtual:exodra-routes',
        fileName: 'routes.js',
        preserveSignature: false
      });
    },
    
    resolveId(id) {
      if (id === 'virtual:exodra-routes') {
        return '\0virtual:exodra-routes';
      }
    },
    
    async load(id) {
      if (id === '\0virtual:exodra-routes') {
        // Generate dynamic route imports
        const routes: string[] = [];
        const imports: string[] = [];
        let layoutIndex = 0;
        let errorIndex = 0;
        
        for (const [route, info] of routeManifest) {
          const routeInfo = typeof info === 'string' ? { file: info } : info;

          // Generate route config
          let routeConfig = `{\n    path: '${route}'`;
          
          // Handle catch-all params
          if (routeInfo.catchAll) {
            routeConfig += `,\n    catchAll: '${routeInfo.catchAll}'`;
          }
          if (routeInfo.optionalCatchAll) {
            routeConfig += `,\n    optionalCatchAll: '${routeInfo.optionalCatchAll}'`;
          }
          
          // Main component
          routeConfig += `,\n    component: lazy(() => import('${routeInfo.file}'))`;
          
          // Layout wrapper
          if (routeInfo.layout) {
            const layoutVar = `layout${layoutIndex++}`;
            imports.push(`import ${layoutVar} from '${routeInfo.layout}';`);
            routeConfig += `,\n    layout: ${layoutVar}`;
          }
          
          // Error component
          if (routeInfo.error) {
            const errorVar = `error${errorIndex++}`;
            imports.push(`import ${errorVar} from '${routeInfo.error}';`);
            routeConfig += `,\n    error: ${errorVar}`;
          }
          
          routeConfig += '\n  }';
          routes.push(routeConfig);
        }
        
        return `
import { lazy } from '@exodra/router';
${imports.join('\n')}

export const routes = [
  ${routes.join(',\n  ')}
];
`;
      }
    }
  };
}

interface RouteInfo {
  file: string;
  catchAll?: string;
  optionalCatchAll?: string;
  layout?: string;
  error?: string;
}

/**
 * Generate routes from file system
 */
async function generateRoutes(pagesDir: string): Promise<Map<string, RouteInfo | string>> {
  const routes = new Map<string, RouteInfo | string>();
  const baseDir = path.resolve(pagesDir);
  
  async function scanDir(dir: string, basePath: string = '', parentLayout?: string, parentError?: string) {
    try {
      const files = await fs.readdir(dir);
      
      // First pass: find layout and error files
      let currentLayout = parentLayout;
      let currentError = parentError;
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (!stat.isDirectory()) {
          const name = file.replace(/\.(tsx|jsx)$/, '');
          if (name === '_layout') {
            currentLayout = filePath;
          } else if (name === '_error') {
            currentError = filePath;
          }
        }
      }
      
      // Second pass: process pages and directories
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          // Nested routes with inherited layout/error
          await scanDir(filePath, path.join(basePath, file), currentLayout, currentError);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
          // Page file
          const name = file.replace(/\.(tsx|jsx)$/, '');
          
          // Skip special files
          if (name.startsWith('_')) {
            continue; // Skip _layout, _error, etc.
          }
          
          let route = basePath;
          
          if (name === 'index') {
            route = basePath || '/';
          } else if (name.startsWith('[...') && name.endsWith(']')) {
            // Catch-all route [...params]
            const param = name.slice(4, -1);
            route = path.join(basePath, `*`);
            routes.set(route.startsWith('/') ? route : `/${route}`, {
              file: filePath,
              catchAll: param,
              layout: currentLayout,
              error: currentError
            });
            continue;
          } else if (name.startsWith('[[...') && name.endsWith(']]')) {
            // Optional catch-all route [[...params]]
            const param = name.slice(5, -2);
            // Add both the exact route and catch-all
            route = basePath || '/';
            routes.set(route.startsWith('/') ? route : `/${route}`, {
              file: filePath,
              optionalCatchAll: param,
              layout: currentLayout,
              error: currentError
            });
            route = path.join(basePath, `*`);
            routes.set(route.startsWith('/') ? route : `/${route}`, {
              file: filePath,
              optionalCatchAll: param,
              layout: currentLayout,
              error: currentError
            });
            continue;
          } else if (name.startsWith('[') && name.endsWith(']')) {
            // Dynamic route [param]
            const param = name.slice(1, -1);
            route = path.join(basePath, `:${param}`);
          } else {
            // Static route
            route = path.join(basePath, name);
          }
          
          routes.set(route.startsWith('/') ? route : `/${route}`, {
            file: filePath,
            layout: currentLayout,
            error: currentError
          });
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
    }
  }
  
  await scanDir(baseDir);
  return routes;
}


/**
 * Create Web API Request from Node request
 */
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
    headers
    // Body will be handled separately for non-GET requests
  });
}

/**
 * Send Web API Response to Node response
 */
async function sendResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  const body = await response.text();
  res.end(body);
}