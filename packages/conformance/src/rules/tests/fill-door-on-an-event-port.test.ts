// @vitest-environment jsdom
//
// `c.on(port, handler)` is guarded by one shared function on every backend; `c.set(port, handler)`
// is guarded by nothing, and the backends give three different answers.
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
                // The mistake under test, and a plausible one: `set` is the general fill.
                c.on(schema.ports.click, () => state.setValue('fired'));
            }),
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return state.onChange(() => show(c));
                });
            })
    );
    const { show } = machine.transitions;
    return machine;
};

describe('a handler put in an event port with set()', () => {
    it('runs on three backends, dies on one, and the server cannot be asked', () => {
        assertExoConformanceRule({
            name: 'set(eventPort, closure), then a click',
            // The `fire` below is what makes this rule need `EXO_CAP_LIVE_TREE`; a rule cannot.
            subject: () => ({ component: buttonWhoseClickShows(), fire: 'click' }),
            expect: {
                // `set` uses the same setter table, which routes an event port to the attacher.
                dom: renders(),
                string: cannotExpress(EXO_CAP_LIVE_TREE),
                term: renders(),
                hydrate: renders(),
            },
            // EVERY LIVE BACKEND NOW ATTACHES IT. `term` refused while one `set` carried every
            // kind and could test for this one; the fill doors are typed instead, and the type is
            // what refuses the mistake. Untyped code reaches the attacher on all three.
            agreement: [['dom', 'hydrate', 'term']],
        });
    });
});
