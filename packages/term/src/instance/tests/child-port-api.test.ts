import {
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    destroyExoNode,
    exoPorts,
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    wireExoNode,
    withExoEffects,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import type { TExoTermNode } from '../EXO_TERM_NODE_VOCABULARY';

const BACKEND = new ExoTermBackend();

const RowPorts = exoPorts({ label: EXO_PORT_TEXT });
const RowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => li.textPort(RowPorts.label));
});
const stops: string[] = [];
const Row = composeExoMachine(
    createExoMachine(RowSchema, {
        createInitialState: (_c: TExoMachineNode, label: string) => ({ label }),
    }),
    (m) => withExoWire(m, (c, label: string) => c.text(RowPorts.label, label)),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => () => void stops.push(c.state.label));
        })
);

const ListPorts = exoPorts({ rows: EXO_PORT_CHILDREN, other: EXO_PORT_CHILDREN });
const ListSchema = createExoSchema(ListPorts, (b) => {
    b.el('box', null, (box) => {
        box.el('a', null, (a) => a.childrenPort(ListPorts.rows));
        box.el('b', null, (b2) => b2.childrenPort(ListPorts.other));
    });
});

describe('the children port on the terminal backend', () => {
    it('places, moves, removes and destroys nodes like the other backends', () => {
        stops.length = 0;
        let parent!: TExoTermNode;
        const host = createExoMachine(ListSchema, {
            createInitialState: (c: TExoTermNode) => {
                parent = c;
                return {};
            },
        });
        const screen = BACKEND.renderScreen(host as never, 40);
        const a = parent.createExoNode(Row as never);
        wireExoNode(a, 'ann');
        parent.appendChild(ListPorts.rows, a);
        const b = parent.insertChild(ListPorts.rows, parent.createExoNode(Row as never), 0);
        wireExoNode(b, 'bob');
        expect(parent.childCount(ListPorts.rows)).toBe(2);
        expect(parent.childAt(ListPorts.rows, 0)).toBe(b);
        parent.moveChild(a, ListPorts.other, 0);
        expect(parent.childCount(ListPorts.other)).toBe(1);
        expect(screen.text()).toContain('ann');
        parent.removeChild(b);
        expect(parent.childCount(ListPorts.rows)).toBe(0);
        expect(stops).toEqual([]);
        destroyExoNode(b);
        expect(stops).toEqual(['bob']);
        screen.dispose();
        expect(stops).toEqual(['bob', 'ann']);
    });
});
