// See `client.mjs` — same three statements, the realistic-todo template.
import { initEmbedded } from 'marko/dom';
import './todo.marko';

const t = performance.now();
initEmbedded(__MARKO_READY_ID__);
window.__HYDMS__ = performance.now() - t;
