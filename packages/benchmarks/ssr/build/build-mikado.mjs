// Build the MIKADO participant: the client bundle the SSR harness hydrates, and the server
// module the measure scripts import.
//
// Run it from `packages/benchmarks`:
//
//   node ssr/build/build-mikado.mjs
//
// Nothing at the repo root has to be built first — `mikado` is a plain npm dependency
// (declared in `packages/benchmarks/package.json`), unlike Exodra's workspace packages.
//
// NO PLUGINS, which is the point of this participant. Mikado compiles its template at RUN
// time on both sides — the server module hands `mikado/ssr` a file path, the client bundle
// hands `Mikado.compile()` the file's text — so there is no compiler in this build script,
// exactly as in `build-exodra.mjs`. The one non-default esbuild setting is the `text`
// loader, which is how the template SOURCE gets into the client bundle as a string; it
// transforms nothing.
//
// `import Mikado from 'mikado'` resolves to two different files by design: node takes the
// package's `main` (`ssr/index.js`, the string renderer) and the browser build takes its
// `module`/`browser` field (the production, non-debug DOM bundle — Mikado ships `.min` and
// `.debug` builds and this is the `.min` one, the same production-build decision Marko's
// `optimize: true` and Solid's non-dev build make here).
//
// FAIRNESS: the client bundle goes through the SAME `bundle()` helper Exodra's, Solid's and
// Marko's use — esbuild, `bundle: true`, `minify: true`, `format: 'esm'`, `target: 'es2020'`,
// ONE file, no code-splitting. The server module is built unminified, exactly like the
// others', because nothing about the server bundle reaches the browser.
//
// NOTE THE DIST DIRECTORY: `ssr/dist/mikado`, one letter from Marko's `ssr/dist/marko`.
// They are different participants and the measure scripts serve them on different ports.
import { bundle } from './lib.mjs';

// [client entry, server entry, dist dir]
const APPS = [
    ['client.mjs', 'server.mjs', 'mikado'], // uniform interactive list
];

const out = [];
for (const [client, server, dir] of APPS) {
    const { raw, gz } = await bundle({
        entryPoints: [`ssr/apps/mikado/${client}`],
        outfile: `ssr/dist/${dir}/client.js`,
        // `import ROW_TEMPLATE from './row.html'` — the template source as a string. The
        // server half reads the same file off disk instead, so there is exactly one copy of
        // the template in this participant.
        //
        // EVERY BYTE OF THAT FILE SHIPS TO THE BROWSER, comments included: only Mikado's
        // server-side compiler strips HTML comments, the runtime one gets the raw text. That
        // is why `row.html` is one bare line and everything there is to say about it lives in
        // `apps/mikado/app.mjs`, whose comments minify away.
        loader: { '.html': 'text' },
    });
    // Bundled rather than left external, like every other participant's server module: the
    // runtime is the same code either way, and inlining it means the measure run cannot fail
    // on a resolution that worked at build time. Unminified so a stack trace from a server
    // render is readable.
    //
    // The bundle does NOT contain the template: `mikado/ssr` reads it from disk at run time,
    // which is why `server.mjs` resolves it against `process.cwd()` and says so if it is
    // missing.
    await bundle({
        entryPoints: [`ssr/apps/mikado/${server}`],
        outfile: `ssr/dist/${dir}/_server.mjs`,
        platform: 'node',
        minify: false,
        // THE SERVER'S DEPENDENCIES ARE NOT BUNDLED, and they cannot be. `mikado/ssr` pulls in
        // `html2json`, which is CommonJS written against a `this` that is the module object —
        // in an ESM bundle `this` is `undefined` and it dies with "Cannot set properties of
        // undefined". Its sibling assigns an undeclared `DEBUG` at module scope, which
        // `define` cannot fix either (that substitutes reads, and this is a write). Left
        // external, Node loads them as the CommonJS they are and both problems disappear.
        // This costs the measurement nothing: the suite weighs the CLIENT payload, and a real
        // deployment does not bundle its server's node_modules either.
        packages: 'external',
    });
    out.push({ app: dir, raw, gz });
}

console.log('\n=== Mikado bundles rebuilt (client, minified — as shipped) ===\n');
for (const r of out)
    console.log(`${r.app.padEnd(14)} ${String(r.raw).padStart(8)} B  ${String(r.gz).padStart(7)} B gz`);
console.log();
