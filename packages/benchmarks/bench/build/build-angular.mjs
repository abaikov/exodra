// Build the ANGULAR participant into ONE self-contained ES module the browser bench loads at
// runtime: `public/bench/angular.js`.
//
// Run it from anywhere:
//
//   npm run build:angular --workspace=@exodra/benchmarks
//
// WHY THIS EXISTS. Every other participant in the browser bench is compiled by the single
// `vite.config.ts` next door, so they all share one toolchain. Angular does not fit in that
// arrangement: compiling it needs `@analogjs/vite-plugin-angular`, which needs
// `@angular/compiler-cli` and `@angular/build`, and `@angular/build` depends on a pinned Vite of
// its own. Putting that plugin in the shared config makes Svelte, Solid, React, Marko and the
// Exodra cores hostage to Angular's toolchain. Here it is hostage to nobody: this script is the
// only thing in the repository that imports the Angular plugin, and the only thing the bench
// page sees is the file it writes. Give this build its own `package.json` and `node_modules`
// later and Angular can pin any Vite it likes without a single other participant moving.
//
// THIS IS THE MODEL THE SSR HALF ALREADY USES — `ssr/build/build-*.mjs` writes `ssr/dist/<name>/`
// and the measure scripts load the BUILT artifact — which is why that half came through
// untouched when the shared install broke.
//
// PRODUCTION SETTINGS ARE STATED HERE, EXPLICITLY, EVERY ONE OF THEM. This suite measured React
// and Solid on their DEBUG builds for its whole life because the settings that select a
// production build were somebody else's default. Angular is worse than most: it does not read
// NODE_ENV at all, it reads three bare globals, and when `ngDevMode` is merely UNDEFINED
// `@angular/core` turns its debug mode on by itself — assertions everywhere, a second
// `checkNoChanges` pass after every change-detection run, performance counters. So the three are
// defined below by name, in this file, where the participant is built.
import { build } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// The package root, derived from this file rather than from cwd, so the script behaves the same
// whether npm runs it from the workspace or a human runs it from the repository root.
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(PKG, 'public', 'bench');
const OUT_FILE = join(OUT_DIR, 'angular.js');

await build({
    root: PKG,
    // The shared config compiles Svelte, Solid and Marko and must not be read here. Loading it
    // would put every other participant's plugin into Angular's build — the exact coupling this
    // script exists to remove.
    configFile: false,
    // `public/` holds the built participants. Vite copies publicDir into outDir on build, and
    // outDir IS inside publicDir here, so leaving this on would copy the directory into itself.
    publicDir: false,
    mode: 'production',
    define: {
        ngDevMode: 'false',
        ngJitMode: 'false',
        ngI18nClosureMode: 'false',
    },
    plugins: [
        // AHEAD OF TIME, which is the only way Angular actually ships: the template becomes Ivy
        // instructions at build time, every node gets its slot index, and nothing of the compiler
        // reaches the browser. `ngJitMode: false` above also makes that requirement fail LOUDLY —
        // without a `ɵcmp` and with JIT compiled out, `createComponent` throws instead of quietly
        // measuring templates compiled by `new Function` at runtime.
        angular({
            tsconfig: 'tsconfig.angular.json',
            // The Angular program is one file and its framework-free import. Type checking is off
            // for the reason `tsconfig.angular.json` gives; the repository's own `tsc` owns types.
            disableTypeChecking: true,
        }),
    ],
    build: {
        outDir: OUT_DIR,
        // `public/bench/` is where every built participant lands. Do not wipe a sibling's artifact.
        emptyOutDir: false,
        target: 'es2020',
        minify: 'esbuild',
        sourcemap: false,
        // Reported below instead, at the real size.
        reportCompressedSize: false,
        lib: {
            entry: join(PKG, 'bench', 'apps', 'angular', 'app.ts'),
            formats: ['es'],
            fileName: () => 'angular.js',
        },
        rollupOptions: {
            // NOTHING is externalized. The artifact is loaded by the browser as a plain file out
            // of `public/`, where a surviving bare `import "@angular/core"` would simply 404 —
            // there is no bundler on the other side to resolve it. Written down rather than
            // left to Vite's lib-mode defaults, which externalize by `peerDependencies`.
            external: [],
            // ONE file, no code-splitting — the same shape `ssr/build/lib.mjs` gives every
            // participant it bundles, so no framework is measured behind an extra round trip.
            output: { inlineDynamicImports: true },
        },
    },
});

const raw = statSync(OUT_FILE).size;
const gz = gzipSync(readFileSync(OUT_FILE)).length;
// eslint-disable-next-line no-console
console.log(
    `\n=== Angular participant built (minified, AOT, ngDevMode off) ===\n` +
        `  public/bench/angular.js   ${raw} B   ${gz} B gz\n\n` +
        `  Loaded by src/benchmarks/participants/angular/app.ts on the schema-initial-render\n` +
        `  and schema-app-update axes. Re-run after editing bench/apps/angular/app.ts —\n` +
        `  a built participant does not hot-reload.\n`
);
