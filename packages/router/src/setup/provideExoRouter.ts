import { EXO_ROUTER } from './constants/EXO_ROUTER';
import type { TExoRouter, TExoProvideWiring } from '../types';

// A function, not a provider component: a component is exactly ONE element, so it would have to
// invent a wrapper node to carry a value that needs none.
//
// It neither creates a router nor disposes one. A wire runs once per INSTANCE, so a router created
// inside one is created TWICE on a page that is rendered and then hydrated, the server's copy still
// subscribed to a history that outlived the request. README: "who creates a router".
export function provideExoRouter(connector: TExoProvideWiring, router: TExoRouter): void {
    connector.provide(EXO_ROUTER, router);
}
