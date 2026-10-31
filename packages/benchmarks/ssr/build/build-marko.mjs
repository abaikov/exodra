// Build the MARKO 6 participant: the client bundles the SSR harness resumes with,
// and the server modules the measure scripts import.
//
// Run it from `packages/benchmarks`:
//
//   node ssr/build/build-marko.mjs
//
// Nothing at the repo root has to be built first — Marko is a plain npm
// dependency, unlike Exodra's workspace packages.
//
// WHY BOTH HALVES ARE BUILT HERE, AND IN ONE RUN: a `.marko` file is a source
// language node cannot import, so the server half needs a build the way the
// Exodra participant's does. More importantly the two halves have to AGREE on the
// template id, which the compiler derives from the file's path relative to the
// package root. One script, one cwd, one run — so the client can never be wired
// to an id the server did not write.
//
// FAIRNESS: the client bundles go through the SAME `bundle()` helper Exodra's,
// Solid's (`build-solid.mjs`) uses — esbuild, `bundle: true`, `minify: true`,
// `format: 'esm'`, `target: 'es2020'`, ONE file, no code-splitting. Marko is
// compiled with `optimize: true`, which is what picks its production runtime
// (`marko/dom`, not `marko/debug/dom`) — the same production-build decision the
// client suite makes for it, and the one this suite got wrong for React and Solid
// for its whole life. The server modules are built unminified, exactly like
// Solid's `_server.mjs`, because nothing about the server bundle
// reaches the browser.
import { resolve } from 'path';
import { bundle, markoPlugin, markoReadyId } from './lib.mjs';

// [template, client entry, server entry, dist dir]
const APPS = [
    ['app.marko', 'client.mjs', 'server.mjs', 'marko'], // uniform interactive list
    ['todo.marko', 'client-todo.mjs', 'server-todo.mjs', 'marko-todo'], // realistic todo
];

const out = [];
for (const [template, client, server, dir] of APPS) {
    // The one thing a hand-written client entry cannot know. See `markoReadyId`.
    const readyId = await markoReadyId(resolve(`ssr/apps/marko/${template}`));

    const { raw, gz } = await bundle({
        entryPoints: [`ssr/apps/marko/${client}`],
        outfile: `ssr/dist/${dir}/client.js`,
        plugins: [markoPlugin('dom')],
        define: { __MARKO_READY_ID__: JSON.stringify(readyId) },
    });
    // Bundled rather than left external, like the Exodra participant's server module: the
    // runtime is the same code either way, and inlining it means the measure run
    // cannot fail on a resolution that worked at build time.
    await bundle({
        entryPoints: [`ssr/apps/marko/${server}`],
        outfile: `ssr/dist/${dir}/_server.mjs`,
        platform: 'node',
        minify: false,
        plugins: [markoPlugin('html')],
    });
    out.push({ app: dir, readyId, raw, gz });
}

console.log('\n=== Marko bundles rebuilt (client, minified — as shipped) ===\n');
for (const r of out)
    console.log(
        `${r.app.padEnd(14)} ${String(r.raw).padStart(8)} B  ${String(r.gz).padStart(7)} B gz   ready id ${r.readyId}`
    );
console.log();
