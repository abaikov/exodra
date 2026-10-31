// The bundle the browser benchmark page imports. It exists because a page cannot import a
// three-package module graph over http; esbuild turns this one file into an ES module it can.
//
// Nothing is re-implemented here — this only re-exports, so the page measures the same code
// the test suite tests. The three specifiers below are where the schema core LIVES now: the
// backend-agnostic half in `@exodra/core`, the DOM and hydrating backends in `@exodra/dom`,
// the server one in `@exodra/string`. They resolve to those packages' `dist`, so a rebuild at
// the repo root (`npm run build`) has to come first or the page runs against older code than
// the tests cover.
//
// `bundle.js` beside it is the OUTPUT. It is NOT checked in (see `.gitignore`) — a checked-in
// bundle goes stale silently and the page then measures whatever the packages looked like on
// the day somebody last remembered to rebuild. Produce it with:
//
//     npm run build:dom-bench --workspace=@exodra/benchmarks
//
// ═══ THE THREE NAMES THIS FILE RE-EXPORTED ARE GONE, AND ONE OF THEM HAS NO REPLACEMENT ═══
//
// It re-exported `renderExoRows` from BOTH `@exodra/dom` and `@exodra/string`, plus
// `hydrateExoRows`. None of those three exists: they were the deleted "n instances of one schema in
// a parent" trio, and a backend is an object now. The bundle therefore did not build at all.
//
//   - THE DOM HALF is expressible with no loss, and is what `page.html` calls: a schema asked for
//     ONCE (`exoDomSchemaOf(schema, backend)`) and then `mountExoInstance(plan, wire, i, i, parent,
//     null, null)` per row. The INDEX MATTERS and that is why the loop is not `backend.render`:
//     `render` mounts one instance with props `0` and index `0`, and this page's row wire reads its
//     index for `data-id`, `data-b` and its label — a loop over `render` would build a thousand
//     copies of row 0 and be compared against a floor that builds a thousand different ones.
//   - THE STRING HALF is the same shape one package over — `exoStrSchemaOf` + `renderExoStrInstance` —
//     and is re-exported for it. `ssr/apps/exodra/server.mjs` now builds its rows exactly so.
//   - THE HYDRATING HALF IS NOT EXPRESSIBLE. Hydration is a pack (`withExoHydration`), what it puts
//     on a backend is `hydrate(component, parent)`, and that adopts `parent`'s FIRST ELEMENT CHILD
//     — ONE instance. Nothing exported walks the siblings after it, so "adopt n rows" has no public
//     spelling. `hydrateExoRows` is therefore NOT re-exported under another name and nothing here
//     stands in for it: a call that adopted row 0 and let the page report n rows hydrated would be
//     worse than the missing export.
export { createExoMachineBuilder, createExoSchema } from '@exodra/core';
export { ExoDomBackend, exoDomSchemaOf, mountExoInstance } from '@exodra/dom';
export { ExoStrBackend, exoStrSchemaOf, renderExoStrInstance } from '@exodra/string';
