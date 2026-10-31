// See `server.mjs`: the measure script owns the stopwatch, this owns the render.
import template from './todo.marko';

export const DEFAULT_N = 200;

export function renderBody() {
    // See `server.mjs` for why `renderId` is pinned.
    return template.render({ $global: { renderId: '_' }, n: globalThis.__N__ ?? DEFAULT_N }).toString();
}
