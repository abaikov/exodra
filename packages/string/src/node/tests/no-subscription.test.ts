// WHAT A SERVER RENDER MUST NOT DO: KEEP A SUBSCRIPTION, AND TOUCH THE SUBJECT.
//
// A SUBSCRIPTION CHANGES NO BYTE, so the rest of the suite, which compares bytes, cannot see it: a
// server that kept one renders exactly the right markup and then holds the component, its wire and
// everything that wire closed over alive for as long as the source lives, once per request, for the
// life of the process.
//
// Following a source is a machine EFFECT — it draws, subscribes and returns the unsubscribe — so
// what is asserted here is the triple that makes it safe on a server: the source is READ, the
// subscription is TAKEN, and the render's end RUNS the disposer.
//
// The second claim is `on`'s: it accepts `c.on(port, handler, subject)` and must read nothing off
// the subject, since that would touch the row's data for a listener about to be serialised away. A
// subject whose properties are getters is the only way to ask that.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoEventHandler,
    TExoTextPort,
    TExoEventPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import type { TExoStrMachine } from '../types/TExoStrMachine';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';
import { ExoStrBackend } from '@exodra/string';
import { createExoTestMachine } from '@exodra/test-utils';

const EXO_STR = new ExoStrBackend();

/** A source that counts what was asked of it, so the assertions are counts and not shapes. */
function countingSource(value: string) {
    const calls = { reads: 0, subscriptions: 0, disposals: 0 };
    return {
        calls,
        getValue(): string {
            calls.reads++;
            return value;
        },
        onChange(_update: () => void): () => void {
            calls.subscriptions++;
            return (): void => {
                calls.disposals++;
            };
        },
    };
}

const BOUND_SOURCE = countingSource('seen');

const BOUND_SCHEMA = createExoSchema((b: TExoSchemaCursor) => {
    let label!: TExoTextPort;
    b.el('i', null, (i) => {
        label = i.textPort();
    });
    return { label };
});
const mBound = createExoMachine<TExoStrNode>(BOUND_SCHEMA);
const BOUND = composeExoMachine(
    mBound,
    (m) =>
        withExoTransitions(m, {
            showLabel: (c) => c.text(BOUND_SCHEMA.ports.label, BOUND_SOURCE.getValue()),
        }),
    (m) => {
        const { showLabel } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showLabel(c);
                return BOUND_SOURCE.onChange(() => showLabel(c));
            });
        });
    }
);

describe('a server render takes no subscription past the response', () => {
    it('reads the source, subscribes once, and the render drops it', () => {
        const before = { ...BOUND_SOURCE.calls };
        const html = EXO_STR.render(BOUND);

        expect(html).toBe('<i>seen</i>');
        expect(BOUND_SOURCE.calls.reads - before.reads).toBe(1);
        expect(BOUND_SOURCE.calls.subscriptions - before.subscriptions).toBe(1);
        // THE ONE THAT MATTERS: the disposer ran, so nothing this request built is still reachable
        // from the source.
        expect(BOUND_SOURCE.calls.disposals - before.disposals).toBe(1);
    });
});

describe('`on` does not touch the subject it is handed', () => {
    it('serialises the markup without reading one property of it', () => {
        let reads = 0;
        const subject = {
            get id(): number {
                reads++;
                return 1;
            },
        };
        const handler: TExoEventHandler<Event, Element> = () => undefined;

        const CLICKABLE: TExoStrMachine = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let click!: TExoEventPort;
                b.el('button', null, (btn) => {
                    click = btn.eventPort('click');
                });
                return { click };
            },
            (P): TExoMachineInitialState<TExoStrNode> =>
                (c) => {
                    c.on(P.click, handler, subject);
                }
        );

        EXO_STR.render(CLICKABLE);
        expect(reads).toBe(0);
    });
});
