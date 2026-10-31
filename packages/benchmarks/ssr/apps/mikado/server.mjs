// The server half of the MIKADO participant, bundled to a node module by
// `ssr/build/build-mikado.mjs` — the same treatment every other participant here gets, so
// the measure scripts import one shape of module (`_server.mjs` exporting `renderBody`)
// regardless of who wrote it.
//
// It deliberately does NOT time itself: the measure scripts run the same seven-render loop
// over every participant, so the stopwatch is one piece of harness code rather than five.
//
// WHAT `import MikadoSSR from 'mikado'` RESOLVES TO. Mikado's package `main` is
// `ssr/index.js`, so importing the package in node gives you the SERVER module, not the DOM
// one — a different class with a different API (`compile()` / `render()`, no mount, no
// events). The browser half of the package is selected by the `browser`/`module` fields and
// is what `client.mjs` gets. One package specifier, two runtimes, no aliasing anywhere in
// this participant.
import MikadoSSR from 'mikado';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { makeStore, rowCount } from './app.mjs';

/**
 * The template file, resolved against the CWD the whole suite already assumes: every
 * measure script computes its `DIST` as `resolve(process.cwd(), 'ssr/dist')`, i.e. they are
 * all run from `packages/benchmarks`.
 *
 * It is a PATH and not the source text because that is the API: `mikado/ssr`'s compiler
 * reads the file itself (`compiler/compile.js` → `readFileSync`). The client half compiles
 * the same file's TEXT with the runtime compiler. Neither is a build step.
 */
const TEMPLATE = resolve(process.cwd(), 'ssr/apps/mikado/row.html');

if (!existsSync(TEMPLATE)) {
    throw new Error(
        `mikado: template not found at ${TEMPLATE}. The Mikado participant compiles its ` +
            'template from source at run time, so the measure scripts must be run from ' +
            '`packages/benchmarks` (the same cwd every other script here assumes).'
    );
}

/**
 * ONE compile for the life of the process, at module load — outside every timed region,
 * exactly as Solid's compiler, Marko's compiler and Exodra's port numbering all run before
 * the stopwatch starts.
 *
 * The options are all passed explicitly because Mikado's defaults key off `NODE_ENV`, which
 * nothing in this suite sets:
 *
 *   compression: true — otherwise the emitter indents its output, which would put a
 *       whitespace text node between every pair of tags: bytes on the wire that no other
 *       participant pays, and a DOM the client's own template no longer matches.
 *   debug: false — the production path; with debug on, the compiler cache is bypassed.
 *   cache: 0 — this is Mikado's LRU over ESCAPED VALUES, not a template cache. The only
 *       string that reaches the escaper here is the row's label, and the labels are all
 *       distinct ("Item 0" … "Item 999"), so a cache could never hit and would only add a
 *       Map get/set/evict per row. Turning it on is a one-word change if an app with
 *       repeating text is ever added.
 */
const view = MikadoSSR.compile(TEMPLATE, { compression: true, debug: false, cache: 0 });

/**
 * The `#app` innerHTML the shell wraps — the same shape every other participant's
 * `renderBody()` returns.
 *
 * `view.render(array)` renders the ROWS (Mikado's SSR `render` concatenates one `apply()`
 * per item); the `<ul class="list">` around them is written here, for the same reason the
 * Exodra participant writes it: the list is the parent the instances live in, not an
 * instance itself, and it is the element `client.mjs` mounts on.
 *
 * No whitespace anywhere in this string — rows are concatenated with nothing between them.
 */
export function renderBody() {
    return '<ul class="list">' + view.render(makeStore(rowCount())) + '</ul>';
}
