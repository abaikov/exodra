// @vitest-environment jsdom
import {
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    withExoEffects,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../ExoDomBackend';
import { withExoCompiler } from '../withExoCompiler';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';

const backend = withExoCompiler(new ExoDomBackend());

type TUser = { readonly id: number; readonly name: string };

const RowPorts = exoPorts({ name: EXO_PORT_TEXT });
const RowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => li.textPort(RowPorts.name));
});
const stops: string[] = [];
const Row = composeExoMachine(
    createExoMachine(RowSchema, {
        createInitialState: (_c: TExoMachineNode, user: TUser) => ({ name: user.name }),
    }),
    (m) =>
        withExoWire(m, (c, user: TUser) => {
            c.state.name = user.name;
            c.text(RowPorts.name, user.name);
        }),
    (m) => withExoEffects(m, (effect) => effect((c) => () => void stops.push(c.state.name)))
);

const ListPorts = exoPorts({ rows: EXO_PORT_CHILDREN });
const ListSchema = createExoSchema(ListPorts, (b) => {
    b.el('ul', null, (ul) => ul.childrenPort(ListPorts.rows));
});

function mount(): { c: TExoDomNode; root: HTMLElement } {
    let c!: TExoDomNode;
    const host = createExoMachine(ListSchema, {
        createInitialState: (node: TExoDomNode) => {
            c = node;
            return {};
        },
    });
    const root = document.createElement('div');
    backend.render(host as never, root);
    return { c, root };
}

const names = (root: HTMLElement): string[] =>
    Array.from(root.querySelectorAll('li')).map((li) => li.textContent ?? '');

const reconcileByIdentity = createExoChildrenReconciler<TUser>(Row);
const reconcileByKey = createExoChildrenReconciler<TUser>(Row, { key: (user) => user.id });
const reconcileAfterHeader = createExoChildrenReconciler<TUser>(Row, { skipFirst: 1, skipLast: 1 });

describe('createExoChildrenReconciler', () => {
    it('keeps the node of every item that stays, by identity, and remembers the order itself', () => {
        stops.length = 0;
        const { c, root } = mount();
        const ann = { id: 1, name: 'ann' };
        const bob = { id: 2, name: 'bob' };
        const cid = { id: 3, name: 'cid' };
        reconcileByIdentity(c, ListPorts.rows, [ann, bob, cid]);
        const bobElement = root.querySelectorAll('li')[1];
        reconcileByIdentity(c, ListPorts.rows, [cid, bob]);
        expect(names(root)).toEqual(['cid', 'bob']);
        expect(root.querySelectorAll('li')[1]).toBe(bobElement);
        expect(stops).toEqual(['ann']);
    });

    it('by key, re-wires a node whose key stayed under a new object', () => {
        stops.length = 0;
        const { c, root } = mount();
        reconcileByKey(c, ListPorts.rows, [
            { id: 1, name: 'ann' },
            { id: 2, name: 'bob' },
        ]);
        const annElement = root.querySelector('li');
        reconcileByKey(c, ListPorts.rows, [
            { id: 2, name: 'bob' },
            { id: 1, name: 'ann lovelace' },
        ]);
        expect(names(root)).toEqual(['bob', 'ann lovelace']);
        expect(root.querySelectorAll('li')[1]).toBe(annElement);
        expect(stops).toEqual([]);
    });

    it('takes a build function instead of a machine', () => {
        const { c, root } = mount();
        const reconcileNames = createExoChildrenReconciler<string>((owner: TExoDomNode, name) => {
            const node = owner.createExoNode(Row);
            node.wireExoSelf({ id: 0, name });
            return node;
        });
        reconcileNames(c, ListPorts.rows, ['x', 'y']);
        expect(names(root)).toEqual(['x', 'y']);
    });

    it('leaves the children before and after its run alone', () => {
        const { c, root } = mount();
        const head = c.createExoNode(Row);
        head.wireExoSelf({ id: 0, name: 'head' });
        c.appendChild(ListPorts.rows, head);
        const foot = c.createExoNode(Row);
        foot.wireExoSelf({ id: 0, name: 'foot' });
        c.appendChild(ListPorts.rows, foot);
        const ann = { id: 1, name: 'ann' };
        const bob = { id: 2, name: 'bob' };
        reconcileAfterHeader(c, ListPorts.rows, [ann, bob]);
        expect(names(root)).toEqual(['head', 'ann', 'bob', 'foot']);
        reconcileAfterHeader(c, ListPorts.rows, [bob]);
        expect(names(root)).toEqual(['head', 'bob', 'foot']);
        reconcileAfterHeader(c, ListPorts.rows, []);
        expect(names(root)).toEqual(['head', 'foot']);
    });

    it('keeps one run per reconciler, so two of them share a port', () => {
        const { c, root } = mount();
        const first = createExoChildrenReconciler<TUser>(Row);
        const second = createExoChildrenReconciler<TUser>(Row, { skipFirst: 1 });
        first(c, ListPorts.rows, [{ id: 1, name: 'one' }]);
        second(c, ListPorts.rows, [
            { id: 2, name: 'two' },
            { id: 3, name: 'three' },
        ]);
        expect(names(root)).toEqual(['one', 'two', 'three']);
    });
});
