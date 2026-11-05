// @vitest-environment jsdom
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    wireExoNode,
} from '@exodra/core';
import type { TExoChildrenPort, TExoMachineNode, TExoNode } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { host } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

let stopped: string[] = [];
let labels: readonly string[] = [];

const RowPorts = exoPorts({ LABEL: EXO_PORT_TEXT });

const RowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', { class: 'row' }, (li) => {
        li.textPort(RowPorts.LABEL);
    });
});

const rowMachine = composeExoMachine(
    createExoMachine(RowSchema, {
        createInitialState: (c: TExoMachineNode, label: string) => {
            c.text(RowPorts.LABEL, label);
            return { label };
        },
    }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => () => {
                stopped.push(c.state.label);
            });
        })
);

type TListSurface = TExoMachineNode & {
    portChildList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode>;
    createExoNode(machine: typeof rowMachine): TExoNode;
};

const ListPorts = exoPorts({ ROWS: EXO_PORT_CHILDREN });

const ListSchema = createExoSchema(ListPorts, (b) => {
    b.el('ul', { class: 'list' }, (ul) => {
        ul.childrenPort(ListPorts.ROWS);
    });
});

const listMachine = createExoMachine(ListSchema, {
    createInitialState: (c: TListSurface) => {
        reconcileExoOrder(c.portChildList(ListPorts.ROWS), [], labels, labels, (label) =>
            wireExoNode(c.createExoNode(rowMachine), label)
        );
        return {};
    },
});

const serveThenHold = (served: readonly string[], held: readonly string[]): HTMLElement => {
    labels = served;
    const parent = host();
    parent.innerHTML = EXO_STR.render(listMachine as never);
    labels = held;
    stopped = [];
    return parent;
};

const rowsIn = (parent: Element): Element[] => Array.from(parent.querySelectorAll('li.row'));

describe('disposing a hydrated page that holds a reconciled child list', () => {
    it('stops the effects of every adopted row', () => {
        const parent = serveThenHold(['a', 'b', 'c'], ['a', 'b', 'c']);
        const served = rowsIn(parent);

        const dispose = EXO_BACKEND.hydrate(listMachine as never, parent);

        expect(rowsIn(parent)).toEqual(served);
        expect(stopped).toEqual([]);

        dispose();

        expect(stopped).toEqual(['a', 'b', 'c']);
    });

    it('stops the rows built past the markup as well as the adopted ones', () => {
        const parent = serveThenHold(['a'], ['a', 'b']);

        const dispose = EXO_BACKEND.hydrate(listMachine as never, parent);
        expect(rowsIn(parent)).toHaveLength(2);

        dispose();

        expect(stopped).toEqual(['a', 'b']);
    });

    it('stops each row once when the disposer is called twice', () => {
        const parent = serveThenHold(['a', 'b'], ['a', 'b']);

        const dispose = EXO_BACKEND.hydrate(listMachine as never, parent);
        dispose();
        dispose();

        expect(stopped).toEqual(['a', 'b']);
    });
});
