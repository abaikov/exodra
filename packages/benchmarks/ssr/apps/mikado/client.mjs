// The client half of the MIKADO participant: ADOPT the markup `server.mjs` sent, from the
// same `row.html` that produced it.
//
// WHAT MIKADO'S HYDRATION ACTUALLY IS (src/mikado.js, `mount(target, true)`):
//
//   1. the view takes `target.children` as its instance list — no node is created, moved or
//      removed, and `view.length` becomes the number of rows the server sent;
//   2. the FACTORY is derived by cloning the first server row and walking the compiled
//      template over that clone, which is also what registers the delegated listener for
//      every event the template names (`factory.js` → `listen('click')`). One walk for the
//      whole list, not one per row;
//   3. nothing else. A row's address table (Mikado's "path": the integer-indexed array of
//      the nodes its expressions write to) is built lazily, on the first `update()` of that
//      row, and then memoised on the row node.
//
// So this participant pays almost nothing at load and pays a row's wiring on that row's
// first click — the same shape of bet Qwik makes, arrived at from a template library. That
// is exactly what TTI in this suite asks about, and why Mikado belongs in it.
//
// Two consequences worth stating because they change how the numbers read:
//
//   - THE RUNTIME COMPILE IS INSIDE THE MEASURED WINDOW. `Mikado.compile()` parses the
//     template source in the browser. A participant that ran `npx mikado-compile` at build
//     time would not pay it — but then it would need a build step, and the point of putting
//     Mikado next to Exodra is that neither of them requires one. It is timed where it is
//     really paid.
//   - NOTHING IS RE-RENDERED HERE. `view.render(store)` is NOT called: without `recycle` or
//     a key, Mikado's `render()` clears the root first (`mikado.js`: `remove(0, length)`),
//     which would throw the server's markup away and show up in `ssr/gate.mjs` as N removed
//     elements. The store below is state the client owns; it is written into the DOM one row
//     at a time, when that row is clicked.
import Mikado from 'mikado';
import ROW_TEMPLATE from './row.html';
import { makeStore, ROUTE } from './app.mjs';

const t = performance.now();

// The `<ul class="list">` the shell carries — the parent the rows live in, and the one
// element on the page nobody adopts because nobody rendered it as an instance.
const list = document.getElementById('app').firstElementChild;

const view = new Mikado(Mikado.compile(ROW_TEMPLATE)).mount(list, true);

// One state object per adopted row. `view.length` is what `mount()` counted in the server's
// markup, so this cannot disagree with the page — no `window.__N__` to read and nothing to
// keep in step across a sweep.
const store = makeStore(view.length);

// Mikado's routing: ONE delegated listener (registered above, when the factory was derived)
// walks up from the click target to the element carrying `click="inc"` and calls this. The
// target IS that element — the row's button — so the row is its parent.
//
// `view.index(node)` is Mikado's own answer to "which instance is this", an indexOf over the
// adopted list; a real app with a big list would read the row's own `data-b` instead, but a
// benchmark should use the framework's API rather than a shortcut around it.
//
// `update()` runs the compiled apply function for that row against its path array, building
// the path on first use and reusing it after: the counter's text node is written, and so are
// the row's other three expressions with the values they already have. That is Mikado's
// update granularity — a row — and it is not filed down here.
Mikado.route(ROUTE, (target) => {
    const row = target.parentElement;
    const i = view.index(row);
    const item = store[i];
    item.count++;
    view.update(row, item, null, i);
});

window.__HYDMS__ = performance.now() - t;
