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
import { ExoStrBackend } from '../ExoStrBackend';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';

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

const PagePorts = exoPorts({ users: EXO_PORT_CHILDREN, tags: EXO_PORT_CHILDREN });
const PageSchema = createExoSchema(PagePorts, (b) => {
    b.el('div', null, (div) => {
        div.el('ul', null, (ul) => ul.childrenPort(PagePorts.users));
        div.el('ol', null, (ol) => ol.childrenPort(PagePorts.tags));
    });
});

describe('the children port on the server', () => {
    it('prints children in port order, wired before or after insert, and ends them with the request', () => {
        stops.length = 0;
        const page = createExoMachine(PageSchema, {
            createInitialState: (c: TExoStrNode) => {
                const ann = c.createExoNode(Row as never);
                wireExoNode(ann, 'ann');
                c.appendChild(PagePorts.users, ann);
                const bob = c.insertChild(PagePorts.users, c.createExoNode(Row as never), 0);
                wireExoNode(bob, 'bob');
                const red = c.appendChild(PagePorts.users, c.createExoNode(Row as never));
                wireExoNode(red, 'red');
                c.moveChild(red, PagePorts.tags, 0);
                const gone = c.appendChild(PagePorts.users, c.createExoNode(Row as never));
                wireExoNode(gone, 'gone');
                c.removeChild(gone);
                destroyExoNode(gone);
                return {};
            },
        });
        expect(new ExoStrBackend().render(page as never)).toBe(
            '<div><ul><li>bob</li><li>ann</li></ul><ol><li>red</li></ol></div>'
        );
        expect(stops.sort()).toEqual(['ann', 'bob', 'gone', 'red']);
    });
});
