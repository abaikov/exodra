// @vitest-environment jsdom
//
// `addEventListener` leaves nothing on an element any API can read back, so a rule comparing
// artefacts would find "attaches" and "prints nothing" IDENTICAL. This one fires the event and
// reads what the handler DID: it moves a source, and an attribute an effect follows it with lands
// in the artefact.
// The cost is that the server answers CANNOT-EXPRESS, since there is no observable on a server for
// a listener that was never attached.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoEventPort,
    TExoMachineNode,
    TExoWiring,
} from '@exodra/core';
import { source } from '@exodra/test-utils';
import { describe, it } from 'vitest';
import { EXO_CAP_LIVE_TREE, cannotExpress, assertExoConformanceRule, renders } from '../../index';

const buttonWhoseClickShows = () => {
    const state = source('idle');
    const schema = createExoSchema((b: TExoSchemaCursor) => {
        let click!: TExoEventPort;
        let shown!: TExoAttrPort;
        b.el('button', null, (btn) => {
            shown = btn.port('data-state');
            click = btn.eventPort('click');
        });
        return { click, shown };
    });
    const m = createExoMachine<TExoWiring & TExoMachineNode>(schema);
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                show: (c) => c.attr(schema.ports.shown, state.getValue()),
            }),
        (m) =>
            withExoWire(m, (c) => {
                c.on(schema.ports.click, () => state.setValue('fired'));
            }),
        (m) => {
            const { show } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return state.onChange(() => show(c));
                });
            });
        }
    );
    return machine;
};

describe('a handler on an event port', () => {
    it('runs on every live backend, and the server cannot be asked', () => {
        assertExoConformanceRule({
            name: 'on(eventPort, closure), then a click',
            // The `fire` below is what makes this rule need `EXO_CAP_LIVE_TREE`; a rule cannot.
            subject: () => ({ component: buttonWhoseClickShows(), fire: 'click' }),
            expect: {
                dom: renders(),
                string: cannotExpress(EXO_CAP_LIVE_TREE),
                term: renders(),
                hydrate: renders(),
            },
            agreement: [['dom', 'hydrate', 'term']],
        });
    });
});
