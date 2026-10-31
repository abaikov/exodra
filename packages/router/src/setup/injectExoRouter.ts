import { EXO_ROUTER } from './constants/EXO_ROUTER';
import type { TExoRouter, TExoInjectWiring } from '../types';

// THROWS where `c.inject` would answer `undefined`: with no router an outlet shows nothing and a
// link cannot resolve an href, and both would fail later with nothing naming the missing provide.
export function injectExoRouter(connector: TExoInjectWiring): TExoRouter {
    const router = connector.inject(EXO_ROUTER);

    if (router === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'Exodra router: nothing above this component provided a router. Call ' +
                  'provideExoRouter(c, router) in the wiring of a component that stands above ' +
                  'it — the root of the page is the ordinary place — and do it on the server ' +
                  'as well as in the browser, since the same wire runs on both.'
                : 'EXO0071'
        );
    }

    return router;
}
