// The client half of the EXODRA participant (the schema core): ADOPT the markup `server.mjs` sent,
// with the SAME component — the very value that produced it, wiring included.
//
// Hydration creates, moves and removes nothing. It replays the walk the DOM backend would have run
// over a clone — over the server's nodes instead — and then runs the wiring, which attaches the one
// thing markup cannot carry: the click listener. Every attribute and every text node on the page is
// the server's, untouched. That is what `ssr/gate.mjs`'s MutationObserver counts, and why this
// participant reports zero removed elements.
//
// `hydrate(LIST, #app)` adopts `#app`'s first element child — the `<ul class="list">` — as the LIST
// instance, and `c.list(P.rows, ROW, rowCount())` inside its wiring adopts every `<li>` in it. The
// row count must be the one the server rendered with, which is why both halves read it from the
// same `rowCount()`.
import { ExoDomBackend, withExoHydration } from '@exodra/dom';
import { LIST } from './app.mjs';

const EXO_BACKEND = withExoHydration(new ExoDomBackend());

const t = performance.now();
// The disposer is dropped on purpose: this page lives until it is closed, and there is no unmount to
// run it from. It exists because a subscription with nothing to end it is refused by the core.
EXO_BACKEND.hydrate(LIST, document.getElementById('app'));
window.__HYDMS__ = performance.now() - t;
