import { renderExoPage } from '@exodra/ssr';
import { APP } from './app';

/**
 * NOT RUN SINCE THIS FILE WAS REWRITTEN. Its comment named `hydrateExoRows`, which no longer
 * exists, and its call passed a row COUNT as the second argument, which `renderExoPage` has not
 * taken for some time — the second parameter is the page's options object, so `1` was landing in
 * `new ExoSsrResponse(...)`.
 *
 * One synchronous render. `renderExoPage` runs the same wiring the browser will run, collects
 * anything the page said about the response, and hands back the markup plus a
 * `<script type="application/json">` for whatever state was seeded — empty here, since this app
 * has none. Underneath it is `new ExoStrBackend().render(APP)`, composed once at that module's
 * load; this entry point takes no composition of its own.
 *
 * The markup goes INSIDE the hydration container (`<div id="app">` in `index.html`): that is the
 * element `backend.hydrate` is handed in `entry-client.ts`, and the instance is its first element
 * child.
 */
export function render() {
    const page = renderExoPage(APP);
    return { appHtml: page.html, stateScript: page.stateScript };
}
