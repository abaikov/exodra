// ONE COMPONENT, BOTH BACKENDS, WITH A RECONCILER IN IT.
//
// A request has no second pass, so there is nothing to reconcile AGAINST: the server reads the
// source once, prints a row per item and never hears about a change again. That is not a special
// case the component has to write — a reconciler's first pass over an empty list is insert-only, so
// the server path through `reconcileExoOrder` is exactly "build N and place them in order".
//
// WHICH MAKES THE REAL CLAIM THIS FILE HOLDS: a component that follows a source does not fork into
// a browser version and a server version. The bytes below come from the same wiring function the
// DOM runs, and they are compared against the FIXED list's bytes, which is the form that was
// portable before this door existed.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoTextPort,
    TExoChildrenWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';
import { createExoTestMachine } from '@exodra/test-utils';

import { ExoStrBackend } from '../ExoStrBackend';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';
import type { TExoStrChildList } from '../types/TExoStrChildList';
import type { TExoStrMachine } from '../types/TExoStrMachine';

const EXO_STR = new ExoStrBackend();

type TItem = { readonly label: string };

const ROW = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('li', null, (li) => {
            label = li.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<{ text(port: TExoTextPort, value: unknown): void }> =>
        (c, item) => {
            c.text(P.label, (item as TItem).label);
        }
);

/** What a wire that follows a source assumes: core's children surface plus the placement door. */
type TPlacing = TExoChildrenWiring & {
    childList(port: TExoChildrenPort): TExoPlacedChildren<unknown>;
};

const shell = (wire: (ports: { rows: TExoChildrenPort }) => TExoMachineInitialState<never>) =>
    createExoTestMachine((b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', { class: 'rows' }, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    }, wire as unknown as (ports: { rows: TExoChildrenPort }) => TExoMachineInitialState<never>);

/** A source with no subscribers: the server registers one and the request ends. */
const frozen = (items: readonly TItem[]) => ({
    getValue: (): readonly TItem[] => items,
    onChange:
        (_update: () => void): (() => void) =>
        (): void =>
            undefined,
});

type TListState = { readonly rows: TExoStrChildList; shown: TItem[] };

const reconciledListOf = (items: readonly TItem[]): TExoStrMachine => {
    const source = frozen(items);
    const schema = createExoSchema((b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', { class: 'rows' }, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    const m = createExoMachine<TExoStrNode, unknown, TListState>(schema, {
        createInitialState: (c) => ({ rows: c.childList(schema.ports.rows), shown: [] as TItem[] }),
    });
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const want = source.getValue();
                    c.state.shown = reconcileExoOrder(
                        c.state.rows,
                        c.state.shown,
                        want,
                        want,
                        (item) => c.build(ROW, item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return source.onChange(() => showRows(c));
                });
            });
        }
    );
    return machine;
};

const fixedListOf = (items: readonly TItem[]) => {
    return shell(
        (P) =>
            ((c: TExoChildrenWiring) => {
                c.list(P.rows, ROW, items);
            }) as unknown as TExoMachineInitialState<never>
    );
};

const A: TItem = { label: 'a' };
const B: TItem = { label: 'b' };
const C: TItem = { label: 'c' };

describe('a component that reconciles its children, rendered by @exodra/string', () => {
    it('prints a row per item, in the source order', () => {
        expect(EXO_STR.render(reconciledListOf([A, B, C]))).toBe(
            '<ul class="rows"><li>a</li><li>b</li><li>c</li></ul>'
        );
    });

    it('prints the SAME BYTES as the fixed list, which is what makes the component one component', () => {
        const reconciled = EXO_STR.render(reconciledListOf([A, B, C]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fixed = EXO_STR.render(fixedListOf([A, B, C]) as any);
        expect(reconciled).toBe(fixed);
    });

    it('prints an EMPTY port for an empty source — no marker, no wrapper', () => {
        expect(EXO_STR.render(reconciledListOf([]))).toBe('<ul class="rows"></ul>');
    });

    it('holds the same item twice as two rows, because a position is a row here too', () => {
        expect(EXO_STR.render(reconciledListOf([A, A, B]))).toBe(
            '<ul class="rows"><li>a</li><li>a</li><li>b</li></ul>'
        );
    });

    it('hands back a live instance from build, printed only when it is inserted', () => {
        const LABEL = ROW.declaration.ports.label as TExoTextPort;
        const LIST = shell(
            (P) =>
                ((c: TPlacing & TExoChildrenWiring) => {
                    const row = c.build(ROW, A) as unknown as {
                        text(port: TExoTextPort, value: unknown): void;
                    };
                    row.text(LABEL, 'driven before insert');
                    c.childList(P.rows).insert(row as never);
                }) as unknown as TExoMachineInitialState<never>
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(EXO_STR.render(LIST as any)).toBe(
            '<ul class="rows"><li>driven before insert</li></ul>'
        );
    });
});
