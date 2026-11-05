// @vitest-environment jsdom
import {
    composeExoMachine,
    connectExoNode,
    createExoMachine,
    createExoSchema,
    destroyExoNode,
    disconnectExoNode,
    exoPorts,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    wireExoNode,
    withExoEffects,
    withExoHandlers,
    withExoTransitions,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../ExoDomBackend';
import { withExoCompiler } from '../withExoCompiler';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';

const backend = withExoCompiler(new ExoDomBackend());

const RowPorts = exoPorts({ label: EXO_PORT_TEXT, press: EXO_PORT_EVENT });
const RowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.textPort(RowPorts.label);
        li.eventPort(RowPorts.press, 'click');
    });
});

function rowMachineLogging(log: string[]) {
    return composeExoMachine(
        createExoMachine(RowSchema, {
            createInitialState: (_c: TExoMachineNode, label: string) => {
                log.push(`state ${label}`);
                return { label, presses: 0 };
            },
        }),
        (m) =>
            withExoTransitions(m, {
                rename: (c, label: string) => {
                    c.state.label = label;
                    c.text(RowPorts.label, label);
                },
            }),
        (m) =>
            withExoWire(m, (c, label: string) => {
                log.push(`wire ${label}`);
                c.state.label = label;
                c.text(RowPorts.label, label);
            }),
        (m) =>
            withExoHandlers(m, (on) =>
                on(RowPorts.press, (c) => {
                    c.state.presses++;
                    log.push(`press ${c.state.label}`);
                })
            ),
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => {
                    log.push(`effect on ${c.state.label}`);
                    return () => log.push(`effect off ${c.state.label}`);
                });
            })
    );
}

const ListPorts = exoPorts({ rows: EXO_PORT_CHILDREN, other: EXO_PORT_CHILDREN });
const ListSchema = createExoSchema(ListPorts, (b) => {
    b.el('div', null, (div) => {
        div.el('ul', null, (ul) => ul.childrenPort(ListPorts.rows));
        div.el('ol', null, (ol) => ol.childrenPort(ListPorts.other));
    });
});

function mountHost(): { parent: TExoDomNode; root: HTMLElement; dispose: () => void } {
    let parent!: TExoDomNode;
    const host = createExoMachine(ListSchema, {
        createInitialState: (c: TExoDomNode) => {
            parent = c;
            return {};
        },
    });
    const root = document.createElement('div');
    const dispose = backend.render(host as never, root);
    return { parent, root, dispose };
}

const labels = (root: HTMLElement, tag: string): string[] =>
    Array.from(root.querySelectorAll(`${tag} > li`)).map((li) => li.textContent ?? '');

describe('the children port', () => {
    it('creates a node, wires it before or after insert, and places it by position', () => {
        const log: string[] = [];
        const Row = rowMachineLogging(log);
        const { parent, root } = mountHost();

        const a = parent.createExoNode(Row);
        expect(log).toEqual([]);
        wireExoNode(a, 'a');
        parent.appendChild(ListPorts.rows, a);
        const b = parent.appendChild(ListPorts.rows, parent.createExoNode(Row));
        wireExoNode(b, 'b');
        const c = parent.insertChild(ListPorts.rows, parent.createExoNode(Row), 0);
        wireExoNode(c, 'c');

        expect(labels(root, 'ul')).toEqual(['c', 'a', 'b']);
        expect(parent.childCount(ListPorts.rows)).toBe(3);
        expect(parent.childAt(ListPorts.rows, 0)).toBe(c);
        expect(log).toEqual([
            'state a',
            'wire a',
            'effect on a',
            'state b',
            'wire b',
            'effect on b',
            'state c',
            'wire c',
            'effect on c',
        ]);
    });

    it('re-wires on demand and keeps state, element and subscriptions across a move', () => {
        const log: string[] = [];
        const Row = rowMachineLogging(log);
        const { parent, root } = mountHost();
        const a = parent.appendChild(ListPorts.rows, parent.createExoNode(Row));
        wireExoNode(a, 'a');
        const b = parent.appendChild(ListPorts.rows, parent.createExoNode(Row));
        wireExoNode(b, 'b');
        const element = root.querySelector('ul > li');

        parent.moveChild(a, 1);
        expect(labels(root, 'ul')).toEqual(['b', 'a']);
        parent.moveChild(a, ListPorts.other, 0);
        expect(labels(root, 'ul')).toEqual(['b']);
        expect(labels(root, 'ol')).toEqual(['a']);
        expect(root.querySelector('ol > li')).toBe(element);

        log.length = 0;
        wireExoNode(a, 'a2');
        expect(labels(root, 'ol')).toEqual(['a2']);
        expect(log).toEqual(['wire a2']);
        (root.querySelector('ol > li') as HTMLElement).click();
        expect(log).toEqual(['wire a2', 'press a2']);
    });

    it('removes from the tree without destroying, and destroys only on request', () => {
        const log: string[] = [];
        const Row = rowMachineLogging(log);
        const { parent, root } = mountHost();
        const a = parent.appendChild(ListPorts.rows, parent.createExoNode(Row));
        wireExoNode(a, 'a');
        log.length = 0;

        parent.removeChild(a);
        expect(labels(root, 'ul')).toEqual([]);
        expect(log).toEqual([]);
        parent.appendChild(ListPorts.rows, a);
        expect(labels(root, 'ul')).toEqual(['a']);

        disconnectExoNode(a);
        expect(log).toEqual(['effect off a']);
        connectExoNode(a);
        expect(log).toEqual(['effect off a', 'effect on a']);

        destroyExoNode(a);
        expect(labels(root, 'ul')).toEqual([]);
        expect(log).toEqual(['effect off a', 'effect on a', 'effect off a']);
        expect(parent.childCount(ListPorts.rows)).toBe(0);
    });

    it('clears a port, destroying what it held, and the parent destroys what its ports hold', () => {
        const log: string[] = [];
        const Row = rowMachineLogging(log);
        const { parent, root, dispose } = mountHost();
        for (const label of ['a', 'b']) {
            wireExoNode(parent.appendChild(ListPorts.rows, parent.createExoNode(Row)), label);
        }
        wireExoNode(parent.appendChild(ListPorts.other, parent.createExoNode(Row)), 'c');
        log.length = 0;

        parent.replaceChildren(ListPorts.rows);
        expect(labels(root, 'ul')).toEqual([]);
        expect(log).toEqual(['effect off a', 'effect off b']);

        dispose();
        expect(log).toEqual(['effect off a', 'effect off b', 'effect off c']);
    });

    it('creates, wires and mounts a root through the backend the same way', () => {
        const log: string[] = [];
        const Row = rowMachineLogging(log);
        const root = backend.createExoNode(Row as never);
        wireExoNode(root, 'root');
        const parent = document.createElement('div');
        const dispose = backend.mountRoot(root, parent);
        expect(parent.textContent).toBe('root');
        wireExoNode(root, 'again');
        expect(parent.textContent).toBe('again');
        dispose();
        expect(log).toContain('effect off again');
    });
});
