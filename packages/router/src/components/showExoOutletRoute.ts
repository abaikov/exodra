import { wireExoNode } from '@exodra/core';
import { isExoLazyLoader } from '../pages/exoLazy';
import { isExoPageMachine } from '../pages/isExoPageMachine';
import { preloadExoPage, resolvedPage } from '../pages/preloadExoPage';
import type { TExoOutletState, TExoPageMachine, TExoRouteMatch } from '../types';

// Only the match moved: a page with a wire is RE-WIRED with it, one without is rebuilt.
export function showExoOutletRoute(state: TExoOutletState): void {
    const match = state.router.getMatches()[state.depth];
    const pageMachine = match === undefined ? null : pageMachineOf(state, match);

    if (pageMachine !== null && pageMachine === state.pageMachine && state.pageNode !== null) {
        if (match !== state.match) {
            if (pageMachine.wire === undefined) {
                replacePage(state, match, pageMachine);
                return;
            }
            state.match = match;
            wireExoNode(state.pageNode, pageMachine, match);
        }
        showNestedRoutes(state);
        return;
    }
    replacePage(state, match, pageMachine);
}

function replacePage(
    state: TExoOutletState,
    match: TExoRouteMatch | undefined,
    pageMachine: TExoPageMachine | null
): void {
    if (state.pageNode !== null) {
        state.pageNode = null;
        state.childList.remove(0);
    }
    state.match = match;
    state.pageMachine = pageMachine;
    if (pageMachine === null) return;
    if (state.ids !== null) state.ids.next = 0;
    const pageNode = state.node.build(pageMachine, state.depth, match);
    state.pageNode = pageNode;
    state.childList.insert(pageNode);
}

function showNestedRoutes(state: TExoOutletState): void {
    const nested = state.nestedOutletStates;
    for (let i = 0; i < nested.length; i++) {
        const nestedState = nested[i];
        if (nestedState.connected) nestedState.showRoute(nestedState.node);
    }
}

function pageMachineOf(state: TExoOutletState, match: TExoRouteMatch): TExoPageMachine | null {
    const component = match.route.component;
    if (isExoPageMachine(component)) return component;

    if (isExoLazyLoader(component)) {
        const resolved = resolvedPage(component);
        if (resolved !== undefined) return resolved;
        if (state.lazyRouteLoader !== component) {
            state.lazyRouteLoader = component;
            preloadExoPage(component).then(
                () => {
                    if (state.lazyRouteLoader !== component) return;
                    state.lazyRouteLoader = null;
                    if (state.connected) state.showRoute(state.node);
                },
                (error: unknown) => {
                    // Cleared WITHOUT a redraw: the next navigation retries, and nothing loops.
                    if (state.lazyRouteLoader === component) state.lazyRouteLoader = null;
                    console.error('Exodra router: failed to load a lazy page.', error);
                }
            );
        }
        return null;
    }

    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `Exodra router: the route "${match.route.path}" has a component the schema core ` +
              'cannot render. A page here is a machine — the value createExoMachineBuilder(…).done() ' +
              'returns — or an exoLazy() loader that resolves to one.'
            : `EXO0074 "${match.route.path}"`
    );
}
