// The server half of the Marko participant, bundled to a node module by
// `ssr/build/build-marko.mjs` because `.marko` files are a source language node
// cannot import — the same reason the cursor participant's server half is built.
//
// It deliberately does NOT time itself: the measure scripts run the same
// seven-render loop over every participant, so the stopwatch is one piece of
// harness code rather than five.
import template from './app.marko';

export const DEFAULT_N = 1000;

/** The `#app` innerHTML the shell wraps — the same thing `ExoNodeSsr.renderBody()` returns. */
export function renderBody() {
    // `globalThis.__N__` is read at call time (the sweeps change it between
    // renders) and handed to the template as input; the template itself never
    // touches the global, because the client compilation of it never runs.
    //
    // `.render()` does the work eagerly and `.toString()` flushes it, so the pair
    // is what the measure loop must time — `toString()` alone would time nothing.
    // It throws rather than lying if the template ever becomes asynchronous.
    //
    // `renderId: '_'` because Marko gives an EMBEDDED render a random 5–6 character
    // id (a page render gets `_`), and that id is the prefix of every one of the
    // N resume comments. Leaving it random would charge Marko several bytes per row
    // for a disambiguation nothing on this page needs — a handicap invented by the
    // harness, not by Marko. This is what a page-level Marko render already does.
    return template.render({ $global: { renderId: '_' }, n: globalThis.__N__ ?? DEFAULT_N }).toString();
}
