/**
 * @deprecated `@exodra/profiler` profiled the per-node `ExoNode` base class, which
 * has been removed from `@exodra/core` (the DOM and string renderers no longer share
 * a base). Use **`@exodra/dom-profiler`** to profile the live DOM renderer
 * (`ExoNodeDom`) — its `profileDom()` works under jsdom and the browser.
 *
 * This package now ships only the generic, renderer-agnostic `profileClass` /
 * `ClassProfiler` (they patch any class's prototype methods) and is otherwise
 * unmaintained. Everything that referenced the removed `ExoNode` base has been
 * dropped.
 */
// eslint-disable-next-line no-console
console.warn(
    '[@exodra/profiler] deprecated — the ExoNode base it targeted was removed. ' +
        'Use @exodra/dom-profiler (profileDom) to profile the DOM renderer.'
);

export {
    profileClass,
    ClassProfiler,
    type ProfilableClass,
    type ProfileMetrics,
    type ProfileCallback,
} from './class-profiler';
