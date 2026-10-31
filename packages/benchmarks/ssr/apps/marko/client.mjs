// The client half of the Marko participant. This is, line for line, what Marko's
// own bundler plugins generate for a page (`output: 'hydrate'` emits exactly these
// three statements) plus the stopwatch every other participant's client carries:
//
//   1. import the DOM compilation of the template — importing it REGISTERS the
//      template's functions under the ids the server serialised;
//   2. hand control to `initEmbedded`, which walks the resume comments the server
//      wrote and attaches state and listeners to the DOM that is already there.
//
// Unlike Exodra/Solid/cursor there is nothing to build here and no `window.__N__`
// to read: Marko never re-runs the template on the client, it deserialises the
// scopes instead. That is Marko's model, and it is why its HTML is bigger.
//
// `__MARKO_READY_ID__` is replaced at build time by `ssr/build/build-marko.mjs`
// with the id the COMPILER put in its own hydrate entry for this template — a
// hand-written entry cannot derive it. Getting it wrong does not throw; the page
// simply never resumes, which `ssr/gate.mjs` reports as every row DEAD.
import { initEmbedded } from 'marko/dom';
import './app.marko';

const t = performance.now();
initEmbedded(__MARKO_READY_ID__);
window.__HYDMS__ = performance.now() - t;
