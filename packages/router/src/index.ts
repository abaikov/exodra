// The renderer-neutral half below imports nothing from any renderer and never will: a route's
// `component` is opaque to it. README: "What is in here", "How the names are spelt".

// The route boundary: a machine. `ExoOutlet` is a `<div>`, `exoOutlet(tag)` any other element.
export { ExoOutlet, exoOutlet } from './components/exoOutlet';

// A real `<a href>`, taken over on a plain left click and left alone on every other kind. Its
// values are wire params: `c.one(port, ExoLink, { to, label })`.
export { ExoLink } from './components/exoLink';
export { shouldIgnoreExoLinkClick } from './components/shouldIgnoreExoLinkClick';

// `injectExoRouter` throws rather than answering `undefined`: nothing sensible follows from an
// absent router. The raw token is exported for a component that wants `inject` without the throw.
export { provideExoRouter } from './setup/provideExoRouter';
export { injectExoRouter } from './setup/injectExoRouter';
export { EXO_ROUTER } from './setup/constants/EXO_ROUTER';

// `preloadExoPage` remembers the resolved component, which is what makes a lazy route printable by
// a synchronous server render; `fetchExoRouteChunk` only makes the chunk arrive.
export { preloadExoPage } from './pages/preloadExoPage';
export { isExoPageMachine } from './pages/isExoPageMachine';

// ================================================================== RENDERER-NEUTRAL

export { createExoRouter } from './setup/createExoRouter';
export { createExoBrowserHistory } from './history/createExoBrowserHistory';
export { createExoMemoryHistory } from './history/createExoMemoryHistory';
export { collectExoRouteGuards } from './guards/collectExoRouteGuards';
export { executeExoGuards } from './guards/executeExoGuards';
export {
    isExoLazyLoader,
    exoLazy,
    loadExoLazyMachine,
    fetchExoRouteChunk,
    resolveExoRouteMachine,
} from './pages/exoLazy';
export { matchExoRouteChain, matchExoRoutes } from './matching/matchExoRoutes';
export { parseExoPath } from './path/parseExoPath';
// None of these reads a URL: hand them `router.getLocation().search`, or use `router.getQuery()`.
export {
    ExoQueryValidationError,
    mergeExoQuery,
    parseExoQuery,
    exoQuery,
    stringifyExoQuery,
} from './components/exoQuery';
export type * from './types';
