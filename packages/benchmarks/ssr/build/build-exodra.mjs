// Build the EXODRA participant (the schema core, shipped as `@exodra/core` +
// `@exodra/dom` + `@exodra/string`): the client bundle the SSR harness hydrates, and the
// server module the measure scripts import.
//
// Run it from `packages/benchmarks`, after `npm run build` at the repo root — the bundles
// pull `@exodra/core`, `@exodra/dom` and `@exodra/string` out of
// their dists:
//
//   node ssr/build/build-exodra.mjs
//
// WHY THE SERVER SIDE STILL NEEDS A BUILD HERE when it could now be imported directly:
// the measure scripts import ONE shape of module per participant (`_server.mjs` exporting
// `renderBody`), and this app is the file that adapts `renderRows` to it. Bundling it also
// keeps the client and server halves compiled the same way.
//
// NO ALIAS ANYWHERE IN THIS SCRIPT: everything this participant imports is published and
// built, so the plain specifiers resolve — and it is measured as shipped, which is what the
// rest of the suite does.
//
// FAIRNESS: the client bundle goes through the SAME `bundle()` helper Solid's and Marko's use
// — esbuild, `bundle: true`, `minify: true`, `format: 'esm'`, `target: 'es2020'`, ONE file, no
// code-splitting. The server module is built unminified, exactly like Solid's
// `_server.mjs` (`build-solid.mjs`), because nothing about the server bundle reaches the
// browser.
import { bundle } from './lib.mjs';

// [client entry, server entry, dist dir]
const APPS = [
    ['client.mjs', 'server.mjs', 'exodra'], // uniform interactive list
];

const out = [];
for (const [client, server, dir] of APPS) {
    const { raw, gz } = await bundle({
        entryPoints: [`ssr/apps/exodra/${client}`],
        outfile: `ssr/dist/${dir}/client.js`,
    });
    // Bundled rather than left external: the `@exodra` packages are the same code either
    // way, and inlining it means the measure run cannot fail on a resolution that worked
    // at build time. Unminified so a stack trace from a server render is readable.
    await bundle({
        entryPoints: [`ssr/apps/exodra/${server}`],
        outfile: `ssr/dist/${dir}/_server.mjs`,
        platform: 'node',
        minify: false,
    });
    out.push({ app: dir, raw, gz });
}

console.log('\n=== Exodra bundles rebuilt (client, minified — as shipped) ===\n');
for (const r of out)
    console.log(`${r.app.padEnd(14)} ${String(r.raw).padStart(8)} B  ${String(r.gz).padStart(7)} B gz`);
console.log();
