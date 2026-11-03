import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import { EXO_ID_COUNTER, nextExoId, provideExoIds } from '@exodra/context';
import type { TExoChildrenPort, TExoMachine } from '@exodra/core';
import { injectExoRouter } from '../setup/injectExoRouter';
import { onExoRouterCommit } from '../setup/onExoRouterCommit';
import { EXO_OUTLET_STATE } from '../setup/constants/EXO_OUTLET_STATE';
import { showExoOutletRoute } from './showExoOutletRoute';
import type { TExoOutletState, TExoOutletWiring } from '../types';

// CALL IT AT MODULE LEVEL: it builds a schema, numbered and compiled once, so calling it per render
// recompiles an unchanged shape and defeats every per-schema cache underneath.
// Only the outermost boundary listens to the router: a nested one is reached through its parent.
export function exoOutlet(
    tag = 'div',
    attrs?: Readonly<Record<string, unknown>> | null
): TExoMachine<TExoOutletWiring, { page: TExoChildrenPort }> {
    const schema = createExoSchema((b) => {
        let page!: TExoChildrenPort;
        b.el(tag, attrs, (element) => {
            page = element.childrenPort();
        });
        return { page };
    });
    const mOutlet = createExoMachine<TExoOutletWiring, unknown, TExoOutletState>(schema, {
        createInitialState: (c) => {
            const parentState = c.inject(EXO_OUTLET_STATE) ?? null;
            const ids =
                c.inject(EXO_ID_COUNTER) === undefined ? null : provideExoIds(c, nextExoId(c));
            const state: TExoOutletState = {
                router: injectExoRouter(c),
                depth: parentState === null ? 0 : parentState.depth + 1,
                node: c,
                childList: c.childList(schema.ports.page),
                parentState,
                nestedOutletStates: [],
                showRoute,
                match: undefined,
                pageMachine: null,
                pageNode: null,
                lazyRouteLoader: null,
                connected: true,
                ids,
            };
            c.provide(EXO_OUTLET_STATE, state);
            if (parentState !== null) {
                parentState.nestedOutletStates.push(state);
                c.onTeardown(() => {
                    const nested = parentState.nestedOutletStates;
                    const at = nested.indexOf(state);
                    if (at !== -1) nested.splice(at, 1);
                });
            }
            showExoOutletRoute(state);
            return state;
        },
    });

    const machine = composeExoMachine(
        mOutlet,
        (m) =>
            withExoTransitions(m, {
                showRoute: (c) => showExoOutletRoute(c.state),
            }),
        (m) => {
            const { showRoute } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    const state = c.state;
                    state.connected = true;
                    showRoute(c);
                    const off =
                        state.parentState === null
                            ? onExoRouterCommit(state.router, () => showRoute(c))
                            : null;
                    return () => {
                        state.connected = false;
                        if (off !== null) off();
                    };
                });
            });
        }
    );
    const { showRoute } = machine.transitions;
    return machine as TExoMachine<TExoOutletWiring, { page: TExoChildrenPort }>;
}

// The `<div>` outlet, built ONCE at module load. `exoOutlet` is the factory for any other tag.
// It shares this file because a filesystem that ignores case cannot hold `ExoOutlet.ts` beside
// `exoOutlet.ts`.
export const ExoOutlet = exoOutlet('div');
