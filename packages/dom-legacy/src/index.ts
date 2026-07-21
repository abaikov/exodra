// PRIVATE package — the frozen legacy per-node DOM renderer, kept only so we can
// benchmark it head-to-head against the current @exodra/dom (single-node WeakMap)
// implementation. Not published. Export under both the canonical name and the
// historical `ExoNodeDomLegacy` alias used by the comparison benches.
export { ExoNodeDom, ExoNodeDom as ExoNodeDomLegacy } from './ExoNodeDom';
export type { TExoNodeDomSchema } from './ExoNodeDom';
