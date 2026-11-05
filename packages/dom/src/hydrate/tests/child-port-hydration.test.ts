// @vitest-environment jsdom
import {
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    wireExoNode,
    withExoHandlers,
    withExoTransitions,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
import type { TExoChildList, TExoDomNode, TExoDomPortChildList } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const CLIENT = withExoHydration(withExoCompiler(new ExoDomBackend()));
const SERVER = new ExoStrBackend();

const RowPorts = exoPorts({ label: EXO_PORT_TEXT, press: EXO_PORT_EVENT });
const RowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.textPort(RowPorts.label);
        li.eventPort(RowPorts.press, 'click');
    });
});

const pressed: string[] = [];
const Row = composeExoMachine(
    createExoMachine(RowSchema, {
        createInitialState: (_c: TExoMachineNode, label: string) => ({ label }),
    }),
    (m) => withExoWire(m, (c, label: string) => c.text(RowPorts.label, label)),
    (m) => withExoHandlers(m, (on) => on(RowPorts.press, (c) => void pressed.push(c.state.label)))
);

const PagePorts = exoPorts({ users: EXO_PORT_CHILDREN, tags: EXO_PORT_CHILDREN });
const PageSchema = createExoSchema(PagePorts, (b) => {
    b.el('div', null, (div) => {
        div.el('ul', null, (ul) => ul.childrenPort(PagePorts.users));
        div.el('ol', null, (ol) => ol.childrenPort(PagePorts.tags));
    });
});

const served = (users: readonly string[], tags: readonly string[]): HTMLElement => {
    const page = createExoMachine(PageSchema, {
        createInitialState: (c: TExoMachineNode & { list: TExoDomNode['list'] }) => {
            c.list(PagePorts.users, Row as never, users);
            c.list(PagePorts.tags, Row as never, tags);
            return {};
        },
    });
    const root = document.createElement('div');
    root.innerHTML = SERVER.render(page as never);
    return root;
};

const labels = (root: HTMLElement, tag: string): string[] =>
    Array.from(root.querySelectorAll(`${tag} > li`)).map((li) => li.textContent ?? '');

describe('hydrating children placed through the port API', () => {
    it('gives every node the element the server printed at its position in its own port', () => {
        const root = served(['ann', 'bob'], ['red']);
        const before = Array.from(root.querySelectorAll('li'));
        const page = createExoMachine(PageSchema, {
            createInitialState: (c: TExoDomNode) => {
                const tag = c.createExoNode(Row as never);
                const ann = c.createExoNode(Row as never);
                const bob = c.createExoNode(Row as never);
                wireExoNode(tag, 'red');
                c.appendChild(PagePorts.tags, tag);
                c.appendChild(PagePorts.users, ann);
                wireExoNode(ann, 'ann');
                wireExoNode(bob, 'bob');
                c.appendChild(PagePorts.users, bob);
                return {};
            },
        });
        CLIENT.hydrate(page as never, root);

        expect(Array.from(root.querySelectorAll('li'))).toEqual(before);
        expect(labels(root, 'ul')).toEqual(['ann', 'bob']);
        expect(labels(root, 'ol')).toEqual(['red']);
        pressed.length = 0;
        (root.querySelector('ul > li') as HTMLElement).click();
        (root.querySelector('ol > li') as HTMLElement).click();
        expect(pressed).toEqual(['ann', 'red']);
    });

    it('builds what the server did not print and removes what the client did not place', () => {
        const root = served(['ann', 'bob', 'cid'], []);
        const page = createExoMachine(PageSchema, {
            createInitialState: (c: TExoDomNode) => {
                for (const label of ['ann']) {
                    const node = c.appendChild(PagePorts.users, c.createExoNode(Row as never));
                    wireExoNode(node, label);
                }
                const tag = c.appendChild(PagePorts.tags, c.createExoNode(Row as never));
                wireExoNode(tag, 'new');
                return {};
            },
        });
        CLIENT.hydrate(page as never, root);

        expect(labels(root, 'ul')).toEqual(['ann']);
        expect(labels(root, 'ol')).toEqual(['new']);
        pressed.length = 0;
        (root.querySelector('ol > li') as HTMLElement).click();
        expect(pressed).toEqual(['new']);
    });

    it('rewrites a served element whose data changed since the server printed it', () => {
        const root = served(['ann'], []);
        const page = createExoMachine(PageSchema, {
            createInitialState: (c: TExoDomNode) => {
                const node = c.createExoNode(Row as never);
                wireExoNode(node, 'anna');
                c.appendChild(PagePorts.users, node);
                return {};
            },
        });
        CLIENT.hydrate(page as never, root);
        expect(labels(root, 'ul')).toEqual(['anna']);
    });

    it('hydrates the markup the same machine printed through the port API on the server', () => {
        const page = createExoMachine(PageSchema, {
            createInitialState: (c: TExoDomNode) => {
                for (const label of ['ann', 'bob']) {
                    const node = c.createExoNode(Row as never);
                    wireExoNode(node, label);
                    c.appendChild(PagePorts.users, node);
                }
                wireExoNode(c.appendChild(PagePorts.tags, c.createExoNode(Row as never)), 'red');
                return {};
            },
        });
        const root = document.createElement('div');
        root.innerHTML = SERVER.render(page as never);
        const before = Array.from(root.querySelectorAll('li'));
        CLIENT.hydrate(page as never, root);
        expect(Array.from(root.querySelectorAll('li'))).toEqual(before);
        expect(labels(root, 'ul')).toEqual(['ann', 'bob']);
        expect(labels(root, 'ol')).toEqual(['red']);
    });

    it('adopts through a reconciler over the port child lists when both lists are opened before either fills', () => {
        const root = served(['ann', 'bob'], ['red']);
        const before = Array.from(root.querySelectorAll('li'));
        type TLists = { users: TExoChildList; tags: TExoChildList };
        const page = composeExoMachine(
            createExoMachine(PageSchema, {
                createInitialState: (c: TExoDomNode & TExoDomPortChildList): TLists => ({
                    users: c.portChildList(PagePorts.users),
                    tags: c.portChildList(PagePorts.tags),
                }),
            }),
            (m) =>
                withExoWire(m, (c) => {
                    const build = (label: string) => {
                        const node = c.createExoNode(Row as never);
                        wireExoNode(node, label);
                        return node;
                    };
                    reconcileExoOrder(c.state.users, [], ['ann', 'bob'], ['ann', 'bob'], build);
                    reconcileExoOrder(c.state.tags, [], ['red'], ['red'], build);
                })
        );
        CLIENT.hydrate(page as never, root);
        expect(Array.from(root.querySelectorAll('li'))).toEqual(before);
        expect(labels(root, 'ul')).toEqual(['ann', 'bob']);
        expect(labels(root, 'ol')).toEqual(['red']);
    });

    it('builds on the client a node a transition reached before it was placed', () => {
        const root = served(['ann'], []);
        const Renamable = composeExoMachine(Row, (m) =>
            withExoTransitions(m, {
                rename: (c, label: string) => {
                    c.state.label = label;
                    c.text(RowPorts.label, label);
                },
            })
        );
        const page = createExoMachine(PageSchema, {
            createInitialState: (c: TExoDomNode) => {
                const node = wireExoNode(c.createExoNode(Renamable as never), 'ann');
                Renamable.transitions.rename(node as never, 'anna');
                c.appendChild(PagePorts.users, node);
                return {};
            },
        });
        CLIENT.hydrate(page as never, root);
        expect(labels(root, 'ul')).toEqual(['anna']);
        pressed.length = 0;
        (root.querySelector('ul > li') as HTMLElement).click();
        expect(pressed).toEqual(['anna']);
    });
});
