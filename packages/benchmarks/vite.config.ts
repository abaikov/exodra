import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transformSync } from '@babel/core';
import { transform as esbuildTransform } from 'esbuild';
import millionCompiler from 'million/compiler';
import { defineConfig, type Plugin } from 'vite';
import { compile } from '@marko/compiler';
import solid from 'vite-plugin-solid';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { APP_FILE_PATHS } from './src/benchmarks/shared/app-files';
import { slocOfFile } from './scripts/app-sloc.mjs';

const packageRoot = dirname(fileURLToPath(import.meta.url));

/**
 * COUNT EVERY PARTICIPANT'S APP, IN NODE, AND HAND THE NUMBERS TO THE PAGE.
 *
 * The axes print a line count beside every median — what the identical app cost each participant to
 * write, comments and blank lines excluded. That number is COMPUTED, never typed in: a figure a
 * human writes down is right on the day it is written and wrong after the next edit, with nothing
 * saying which day it is.
 *
 * IT RUNS HERE BECAUSE THE COUNTER IS A PARSER. `scripts/app-sloc.mjs` hands each file to
 * TypeScript's own parser and counts the lines that carry a token, which is what makes a `//` inside
 * a string literal — and this suite's files carry URLs — stay part of the string instead of
 * truncating the line. Doing that in the browser would mean shipping the TypeScript compiler into
 * every benchmark page and putting it in the process that is being timed.
 *
 * A FILE IT CANNOT READ BECOMES `null`, NOT A THROW AND NOT A ZERO. A throw would take down every
 * axis over a participant nobody was measuring; a zero would print as the leanest row in the table.
 * `null` reaches `app-lines.ts`, which turns it into a `—` and a refusal line naming the row.
 */
function appSloc(): Plugin {
    const id = 'virtual:app-sloc';
    const resolved = `\0${id}`;
    return {
        name: 'app-sloc',
        resolveId: (source) => (source === id ? resolved : null),
        load(source) {
            if (source !== resolved) return null;
            const counted: Record<string, number | null> = {};
            for (const path of APP_FILE_PATHS) {
                const absolute = resolve(packageRoot, path);
                // Watched so that editing an app re-counts it without restarting the server. The
                // count is a fact about the file and has to move when the file does.
                this.addWatchFile(absolute);
                try {
                    counted[path] = slocOfFile(absolute);
                } catch {
                    counted[path] = null;
                }
            }
            return `export default ${JSON.stringify(counted, null, 4)};`;
        },
        handleHotUpdate({ server, file }) {
            if (!APP_FILE_PATHS.some((path) => file === resolve(packageRoot, path))) return;
            const module = server.moduleGraph.getModuleById(resolved);
            if (module !== undefined) server.moduleGraph.invalidateModule(module);
        },
    };
}

/**
 * Compile `.marko` files with Marko's own compiler.
 *
 * Not `@marko/vite`: that plugin pins `vite@^8`, and this suite is held at
 * vite 7 by Qwik (`>=5 <8`), which the SSR benchmark depends on. The plugin is
 * a thin wrapper over exactly this call, and doing it here keeps Marko's
 * production settings visible beside every other framework's.
 */
function marko(): Plugin {
    return {
        name: 'marko-inline',
        enforce: 'pre',
        async transform(source: string, id: string) {
            if (!id.endsWith('.marko')) return null;
            const { code, map } = await compile(source, id, {
                output: 'dom',
                optimize: true,
                modules: 'esm',
            });
            return { code, map };
        },
    };
}

/**
 * ONE REACT APP, SEVERAL REACTS. `apps/react/react.tsx` is imported once plainly (React itself) and
 * once per drop-in with `?impl=…`, which makes it a separate module whose `react` / `react-dom`
 * imports resolve to that drop-in — the same source text for every row, so no row is handed a
 * different program. `apps/react/react-jsx.jsx` is the JSX twin, compiled by
 * `@exodra/babel-plugin-schema/react` and run on `@exodra/react-compat`.
 */
const REACT_IMPLEMENTATIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    preact: {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
        'react-dom/client': 'preact/compat/client',
        'react/jsx-runtime': 'preact/jsx-runtime',
    },
    compat: {
        react: '@exodra/react-compat',
        'react-dom': '@exodra/react-compat/client',
        'react-dom/client': '@exodra/react-compat/client',
        'react/jsx-runtime': '@exodra/react-compat/jsx-runtime',
    },
};
const REACT_JSX_APP = /\/apps\/(react\/react-jsx|react-libraries\/libraryListJsx)\.jsx$/;
const REACT_LIBRARY = /^(zustand|@tanstack\/)/;
const COMPAT_IMPL = 'impl=compat';
const MILLION_APP = /\/apps\/react\/react-jsx\.jsx\?impl=million$/;
const REACT_COMPILER_APP = /\/apps\/react\/react-jsx\.jsx\?impl=reactCompiler$/;

/**
 * THE REACT-COMPAT ROWS GET THEIR OWN COPY OF THE EXODRA RUNTIME. They run on `@exodra/core` and
 * `@exodra/dom` too, and sharing one module instance with the `exodra` row fed the shared functions
 * the drop-in's object shapes — the `exodra` row measured 1.23–1.29× stage0 with those rows on the page
 * and 1.10–1.14× without them. No application runs both, so each side is handed its own instance:
 * every `@exodra/*` module reached from `@exodra/react-compat` or from the compiled JSX app is loaded
 * again under this query.
 */
const EXODRA_COPY = 'exodra-react-copy';

function ownsExodraCopy(importer: string): boolean {
    return (
        importer.includes(EXODRA_COPY) ||
        /\/react-compat\/(dist|src)\//.test(importer) ||
        REACT_JSX_APP.test(importer)
    );
}

function rewriteReactImports(code: string, impl: string): string {
    const targets = REACT_IMPLEMENTATIONS[impl];
    return code.replace(
        /(from\s*|import\s*\(\s*)(['"])(react|react-dom|react-dom\/client|react\/jsx-runtime)\2/g,
        (_all, head: string, quote: string, name: string) =>
            `${head}${quote}${targets[name]}${quote}`
    );
}

/**
 * MILLION AND SOLID WRITE THE SAME PROPERTY. Both delegate events from `document` and both keep a
 * node's handler at `node[\`$$${event}\`]` (`solid-js/web/dist/web.js` `eventHandler`,
 * `million/dist/shared/*.mjs` `createEventListener`), so on this page — where Solid's listener is
 * always installed — Solid found Million's handler too and every Million click ran twice. Mounted
 * alone, Million fires once. Its key is renamed to `$$million_<event>` while it is pre-bundled;
 * nothing else in its runtime changes.
 */
function millionOwnEventKey(): {
    name: string;
    setup(build: {
        onLoad(
            options: { filter: RegExp },
            run: (args: { path: string }) => { contents: string; loader: 'js' } | undefined
        ): void;
    }): void;
} {
    return {
        name: 'million-own-event-key',
        setup(build) {
            build.onLoad(
                { filter: /million[\\/]dist[\\/]shared[\\/]million\.[^\\/]*\.mjs$/ },
                (args) => {
                    const source = readFileSync(args.path, 'utf8');
                    const contents = source.replace(
                        'const key = `$$${event}`;',
                        'const key = `$$million_${event}`;'
                    );
                    if (contents === source) return undefined;
                    return { contents, loader: 'js' };
                }
            );
        },
    };
}

function reactImplementations(): Plugin {
    const require = createRequire(import.meta.url);
    const exodraReact = require('@exodra/babel-plugin-schema/react');
    const million = millionCompiler.vite({ auto: true, telemetry: false, log: false }) as {
        transform(code: string, id: string): Promise<{ code: string; map?: unknown } | null>;
    };
    return {
        name: 'react-implementations',
        enforce: 'pre',
        async resolveId(source, importer) {
            if (importer === undefined) return null;
            const importerOnCompat =
                importer.includes(COMPAT_IMPL) || REACT_JSX_APP.test(importer.replace(/\?.*$/, ''));
            const importerIsLibraryCopy =
                importer.includes(COMPAT_IMPL) && importer.includes('/node_modules/');
            if (
                importerOnCompat &&
                (REACT_LIBRARY.test(source) || (importerIsLibraryCopy && source.startsWith('.')))
            ) {
                const resolved = await this.resolve(source, importer.replace(/\?.*$/, ''), {
                    skipSelf: true,
                });
                if (resolved === null || resolved.id.includes(COMPAT_IMPL)) return resolved;
                const joiner = resolved.id.includes('?') ? '&' : '?';
                return { ...resolved, id: `${resolved.id}${joiner}${COMPAT_IMPL}` };
            }
            if (
                (ownsExodraCopy(importer) &&
                    source.startsWith('@exodra/') &&
                    !source.startsWith('@exodra/react-compat')) ||
                (importer.includes(EXODRA_COPY) && source.startsWith('.'))
            ) {
                const resolved = await this.resolve(source, importer.replace(/\?.*$/, ''), {
                    skipSelf: true,
                });
                if (resolved === null || resolved.id.includes(EXODRA_COPY)) return resolved;
                return { ...resolved, id: `${resolved.id}?${EXODRA_COPY}` };
            }
            return null;
        },
        async transform(code, id) {
            if (REACT_COMPILER_APP.test(id)) {
                const path = id.replace(/\?.*$/, '');
                const memoised = transformSync(code, {
                    filename: path,
                    babelrc: false,
                    configFile: false,
                    plugins: [
                        '@babel/plugin-syntax-jsx',
                        ['babel-plugin-react-compiler', { target: '19' }],
                    ],
                });
                const out = await esbuildTransform(memoised?.code ?? code, {
                    loader: 'jsx',
                    jsx: 'automatic',
                    jsxImportSource: 'react',
                    sourcefile: path,
                });
                return { code: out.code, map: null };
            }
            if (MILLION_APP.test(id)) {
                const path = id.replace(/\?.*$/, '');
                const blocks = await million.transform(code, path);
                const out = await esbuildTransform(blocks?.code ?? code, {
                    loader: 'jsx',
                    jsx: 'automatic',
                    jsxImportSource: 'react',
                    sourcefile: path,
                });
                return { code: out.code, map: null };
            }
            if (/[?&]impl=compatCalls\b/.test(id)) {
                const path = id.replace(/\?.*$/, '');
                const calls = await esbuildTransform(code, {
                    loader: 'tsx',
                    jsx: 'automatic',
                    jsxImportSource: 'react',
                    sourcefile: path,
                });
                const out = transformSync(calls.code, {
                    filename: path,
                    babelrc: false,
                    configFile: false,
                    sourceType: 'module',
                    plugins: [exodraReact.default ?? exodraReact],
                });
                return { code: rewriteReactImports(out?.code ?? calls.code, 'compat'), map: null };
            }
            const named = /[?&]impl=(preact|compat)\b/.exec(id);
            if (named !== null) return { code: rewriteReactImports(code, named[1]), map: null };
            if (!REACT_JSX_APP.test(id)) return null;
            const out = transformSync(code, {
                filename: id,
                babelrc: false,
                configFile: false,
                sourceMaps: true,
                plugins: ['@babel/plugin-syntax-jsx', exodraReact.default ?? exodraReact],
            });
            return out === null
                ? null
                : { code: rewriteReactImports(out.code ?? '', 'compat'), map: null };
        },
    };
}

export default defineConfig({
    // React picks its build at runtime from process.env.NODE_ENV, and the dev server
    // would otherwise hand it the DEVELOPMENT bundle (1.0 MB, full of warnings and
    // instrumentation) while Svelte is compiled with `dev: false` and Solid/Voby ship
    // essentially the same code either way. That asymmetry made every React number in
    // this suite a measurement of React's debug build. Force production.
    //
    // ANGULAR IS NOT HERE, and that is deliberate — see `bench/build/build-angular.mjs`. It is
    // built on its own into `public/bench/angular.js` and loaded at runtime by
    // `src/benchmarks/participants/angular/app.ts`, so its plugin, its compiler, its three
    // `ngDevMode`-style
    // globals and the Vite that `@angular/build` pins are all reachable from that script and from
    // nowhere else. This config compiles the participants that share a toolchain happily; the one
    // that does not is not in it.
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    // Solid ships a separate `development` export (dist/dev.js) and Vite's dev-server
    // defaults include the 'development' condition, so it would be picked by default —
    // the same debug-build handicap React had. Listing conditions explicitly drops it.
    // Verify with node_modules/.vite/deps/_metadata.json: solid-js must map to
    // dist/solid.js, not dist/dev.js. THAT VERIFICATION IS NO LONGER SOMETHING TO REMEMBER —
    // `scripts/check-build-modes.mjs` asserts it, along with every other participant's build
    // selection and the transform output of every participant module. It runs from
    // `npm run check:build-modes` and from `scripts/run-one-axis.js` before every axis.
    resolve: {
        conditions: ['browser', 'module', 'import', 'default'],
        // Million lives at the repository root and React does not; this resolves Million's `react` to
        // this suite's copy, the one every row runs on.
        dedupe: ['react', 'react-dom'],
    },
    plugins: [
        reactImplementations(),
        appSloc(),
        marko(),
        svelte(),
        solid({
            // A PATH FILTER, NOT AN IMPORT FILTER — the previous comment here read "only transform
            // files that import from solid-js", and that is not what these do. They are picomatch
            // patterns matched against the file PATH (index.mjs:179, `if (!filter(id)) return null`),
            // so EVERY `.tsx` in this suite goes through babel with the Solid preset, whichever
            // framework wrote it. (`.ts` is listed but never reaches the transform: index.mjs:183
            // returns null for anything that is not `.[mc]?[tj]sx`.) That matters for the `hot`
            // option below, and misreading it is how the defect below survived: solid-refresh does
            // not ask which framework a file belongs to, it wraps any top-level PascalCase function
            // component it finds — `SolidApp`, `ReactApp` and `ReactCard` in `todo-app.tsx` alike.
            include: ['**/*.tsx', '**/*.ts'],
            exclude: ['node_modules/**', '**/*.svelte'],
            // The plugin prepends the 'development' export condition whenever the command
            // is `serve`, which pulls in solid-js/dist/dev.js and overrides resolve.conditions
            // set here. `dev: false` keeps Solid on its production build, matching Svelte's
            // `dev: false` and React's forced production bundle.
            dev: false,
            // `dev: false` picks the production RUNTIME; it does not stop the plugin from running
            // solid-refresh over our source. That is a separate switch: the plugin computes
            // `needHmr = command === 'serve' && mode !== 'production' && options.hot !== false`
            // (node_modules/vite-plugin-solid/dist/esm/index.mjs:164) and, when it is true, prepends
            // the `solid-refresh/babel` plugin to every non-SSR, non-node_modules file it transforms
            // (index.mjs:228). `mode` is Vite's own mode — `serve` defaults it to 'development', and
            // the NODE_ENV `define` above is a client-side string replacement that never reaches it.
            // So on our dev server every Solid component was being wrapped in a refresh registry.
            // The plugin's README documents this exact option:
            //   "#### options.hot — Type: Boolean — Default: true
            //    This will inject HMR runtime in dev mode. Has no effect in prod.
            //    If set to false, it won't inject the runtime in dev."
            hot: false,
        }),
    ],
    server: {
        port: 3001,
        open: false, // Don't open browser automatically
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: './index.html',
            },
        },
    },
    optimizeDeps: {
        exclude: [
            'zustand',
            '@tanstack/react-query',
            '@tanstack/query-core',
            '@exodra/core',
            // `context-cost` times `exoContextFrame` and `readExoContext` against a hand-written chain
            // in this package. Pre-bundling the library half of that pair and not the hand-written half
            // is the asymmetry the paragraph below refuses.
            '@exodra/context',
            // `machine-vs-cells` puts the compiled program against hand-written cells IN THIS PACKAGE,
            // and `exodra·inline` writes its own machine beside the shipped one. Pre-bundling the
            // library half of either pair and not the hand-written half is the asymmetry the paragraph
            // below refuses, so this package goes through the same door as `core` and `reconcile`.
            '@exodra/computed',
            '@exodra/dom',
            // `keystroke-floor` measures this package against a floor written in that file, which the
            // dev server transpiles with esbuild. Letting Vite PRE-BUNDLE the library half would make
            // the comparison one transpiler against another AND hand the library rows a bundler pass the
            // floor never gets — the asymmetry `ssr-floor` names as its caveat (1), where `@exodra/string`
            // is pre-bundled and the reported gap is therefore only a LOWER bound. Excluded so both sides
            // of that axis go through the same door.
            '@exodra/forms',
            // `update-floor`'s R2 and R3 rungs swap a hand-written pass in this suite for the shipped
            // `getExoSequence` / `placeExoChildren`, which are here. Pre-bundling one side of that
            // swap and not the other is the asymmetry the paragraph above refuses.
            '@exodra/list-reconcile',
            '@exodra/react-compat',
        ],
        // SVELTE'S RUNTIME IS NAMED HERE BECAUSE DISCOVERING IT MID-RUN KILLS THE RUN.
        //
        // Vite finds dependencies by crawling the entry; nothing in this suite's entry imports
        // `svelte/internal/*`, because only a compiled `.svelte` module does, and that module is
        // fetched by a DYNAMIC import from inside a benchmark. So the first `.svelte` request is the
        // first time Vite hears of them — it re-optimises and reloads the server, and the dynamic
        // import already in flight comes back `ERR_CONNECTION_REFUSED`. `initial-render` died exactly
        // there: `Failed to fetch dynamically imported module: …/CardsDyn.svelte`, with the file itself
        // serving a clean 200 when asked directly a second later.
        //
        // NO OTHER AXIS SEES IT, which is why it read as an axis-specific bug for as long as it did:
        // every other participant is reached through a static import and is crawled at startup.
        include: [
            'svelte',
            'svelte/internal/client',
            'svelte/internal/disclose-version',
            'preact',
            'preact/compat',
            'preact/compat/client',
            'million/react',
            'react/compiler-runtime',
            'react/jsx-runtime',
        ],
        // The top-level `define` does NOT reach dependencies that Vite pre-bundles
        // with esbuild, and react-dom is one of them — without this it keeps loading
        // its development build no matter what the app-level define says.
        esbuildOptions: {
            define: {
                'process.env.NODE_ENV': '"production"',
            },
            // Same story for export conditions: without this esbuild keeps resolving
            // solid-js to dist/dev.js while the app-level resolve.conditions says otherwise.
            conditions: ['browser', 'module', 'import', 'default'],
            plugins: [millionOwnEventKey()],
        },
    },
});
