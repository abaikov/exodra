// @vitest-environment jsdom
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoHandlers,
    withExoEffects,
    createExoSchema,
    wireExoNode,
    swapExoParams,
} from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoEventPort,
    TExoMachineNode,
    TExoNode,
    TExoTextPort,
} from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import { createExoKeyedList } from '@exodra/list-reconcile';
import type { TExoKeyedList } from '@exodra/list-reconcile';
import { source } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../dom/ExoDomBackend';
import { withExoCompiler } from '../dom/withExoCompiler';
import { withExoChildList } from '../dom/withExoChildList';
import type { TExoDomNode } from '../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMark } from '../dom/types/TExoDomMark';

type TCardParams = { readonly label: string; readonly compact: boolean };

const CARD_SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('button', null, (button) => {
        label = button.textPort();
        click = button.eventPort('click');
    });
    return { label, click };
});
const mCard = createExoMachine<TExoMachineNode, TCardParams, { presses: number }>(CARD_SCHEMA, {
    createInitialState: () => {
        order.push('createInitialState');
        return { presses: 0 };
    },
});
const order: string[] = [];
const pressCompact = (c: TExoMachineNode): void => {
    c.text(CARD_SCHEMA.ports.label, 'compact');
};
const CARD = composeExoMachine(
    mCard,
    (m) =>
        withExoTransitions(m, {
            press: (c) => {
                const state = c.state;
                state.presses += 1;
                c.text(CARD_SCHEMA.ports.label, 'pressed ' + state.presses);
            },
        }),
    (m) =>
        withExoWire(m, (c, params) => {
            order.push('wire');
            c.text(CARD_SCHEMA.ports.label, params.label);
            c.transitionOverrides = params.compact ? COMPACT : null;
        }),
    (m) => {
        const { press } = m.transitions;
        return withExoHandlers(m, (on) => {
            on(CARD_SCHEMA.ports.click, (c) => press(c));
        });
    }
);
const COMPACT = CARD.overrides({ press: pressCompact });

const BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

describe('a machine wire and per-instance transition overrides', () => {
    it('runs the wire after createInitialState, with the params render was handed', () => {
        order.length = 0;
        const parent = document.createElement('div');
        BACKEND.render(CARD as never, parent, { label: 'first', compact: false });
        expect(order).toEqual(['createInitialState', 'wire']);
        expect(parent.textContent).toBe('first');
    });

    it('overrides a transition on one instance and leaves the next one alone', () => {
        const LIST_SCHEMA = createExoSchema((b) => {
            let rows!: TExoChildrenPort;
            b.el('div', null, (div) => {
                rows = div.childrenPort();
            });
            return { rows };
        });
        const LIST = createExoMachine<TExoDomNode>(LIST_SCHEMA, {
            createInitialState: (c) => {
                const rows = c.childList(LIST_SCHEMA.ports.rows);
                rows.insert(c.build(CARD as never, { label: 'plain', compact: false }));
                rows.insert(c.build(CARD as never, { label: 'small', compact: true }));
            },
        });
        const parent = document.createElement('div');
        BACKEND.render(LIST, parent);
        const [plain, small] = Array.from(parent.querySelectorAll('button'));

        plain.click();
        small.click();

        expect(plain.textContent).toBe('pressed 1');
        expect(small.textContent).toBe('compact');
    });

    it('hands one() its params on the server too', () => {
        const SHELL_SCHEMA = createExoSchema((b) => {
            let slot!: TExoChildrenPort;
            b.el('section', null, (section) => {
                slot = section.childrenPort();
            });
            return { slot };
        });
        const SHELL = createExoMachine<TExoMachineNode & { one: TExoDomNode['one'] }>(
            SHELL_SCHEMA,
            {
                createInitialState: (c) => {
                    c.one(SHELL_SCHEMA.ports.slot, CARD as never, {
                        label: 'served',
                        compact: false,
                    });
                },
            }
        );
        expect(new ExoStrBackend().render(SHELL as never)).toBe(
            '<section><button>served</button></section>'
        );
    });

    it('re-runs the wire on a live instance, and swapExoParams lets it write only what changed', () => {
        const ROW_SCHEMA = createExoSchema((b) => {
            let title!: TExoTextPort;
            let note!: TExoTextPort;
            b.el('li', null, (li) => {
                li.el('b', null, (bold) => {
                    title = bold.textPort();
                });
                li.el('i', null, (italic) => {
                    note = italic.textPort();
                });
            });
            return { title, note };
        });
        type TRowParams = { readonly title: string; readonly note: string };
        const writes: string[] = [];
        const mRow = createExoMachine<TExoMachineNode, TRowParams>(ROW_SCHEMA, {
            createInitialState: () => ({ mine: true }),
        });
        const ROW = composeExoMachine(mRow, (m) =>
            withExoWire(m, (c, params) => {
                const previous = swapExoParams(c, params);
                if (previous?.title !== params.title) {
                    writes.push('title');
                    c.text(ROW_SCHEMA.ports.title, params.title);
                }
                if (previous?.note !== params.note) {
                    writes.push('note');
                    c.text(ROW_SCHEMA.ports.note, params.note);
                }
            })
        );

        const HOST_SCHEMA = createExoSchema((b) => {
            let slot!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                slot = ul.childrenPort();
            });
            return { slot };
        });
        let row!: TExoMachineNode;
        const HOST = createExoMachine<TExoDomNode>(HOST_SCHEMA, {
            createInitialState: (c) => {
                row = c.one(HOST_SCHEMA.ports.slot, ROW as never, {
                    title: 'a',
                    note: 'n',
                }) as unknown as TExoMachineNode;
            },
        });
        const parent = document.createElement('div');
        BACKEND.render(HOST, parent);
        expect(writes).toEqual(['title', 'note']);

        writes.length = 0;
        wireExoNode(row, ROW, { title: 'b', note: 'n' });
        expect(writes).toEqual(['title']);
        expect(parent.textContent).toBe('bn');
        expect(row.state).toEqual({ mine: true });
    });

    it('re-wires a kept keyed row with the new item and no cast', () => {
        type TProduct = { readonly id: number; readonly name: string };
        const ITEM_SCHEMA = createExoSchema((b) => {
            let name!: TExoTextPort;
            b.el('li', null, (li) => {
                name = li.textPort();
            });
            return { name };
        });
        const mItem = createExoMachine<TExoMachineNode, TProduct>(ITEM_SCHEMA);
        const ITEM = composeExoMachine(mItem, (m) =>
            withExoWire(m, (c, product) => {
                const before = swapExoParams(c, product);
                if (before?.name !== product.name) c.text(ITEM_SCHEMA.ports.name, product.name);
            })
        );
        const products = source<readonly TProduct[]>([
            { id: 1, name: 'Lamp' },
            { id: 2, name: 'Desk' },
        ]);
        const SHOP_SCHEMA = createExoSchema((b) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows };
        });
        const mShop = createExoMachine<TExoDomNode, unknown, { list: TExoKeyedList<TProduct> }>(
            SHOP_SCHEMA,
            {
                createInitialState: (c) => ({
                    list: createExoKeyedList<TProduct, number, TExoNode<TExoDomMark>>(
                        c.childList(SHOP_SCHEMA.ports.rows),
                        (product) => product.id,
                        (product) => c.build(ITEM, product),
                        (row, product) => wireExoNode(row, ITEM, product)
                    ),
                }),
            }
        );
        const SHOP = composeExoMachine(
            mShop,
            (m) =>
                withExoTransitions(m, {
                    showProducts: (c) => {
                        c.state.list.reconcile(products.getValue());
                    },
                }),
            (m) => {
                const { showProducts } = m.transitions;
                return withExoEffects(m, (effect) => {
                    effect((c) => {
                        showProducts(c);
                        return products.onChange(() => showProducts(c));
                    });
                });
            }
        );
        const parent = document.createElement('div');
        BACKEND.render(SHOP, parent);
        const lamp = parent.querySelector('li');
        products.setValue([
            { id: 2, name: 'Desk!' },
            { id: 1, name: 'Lamp' },
        ]);
        expect(parent.textContent).toBe('Desk!Lamp');
        expect(parent.querySelectorAll('li')[1]).toBe(lamp);
    });

    it('lets the wire build an override per instance that closes over its own params', () => {
        const STEP_SCHEMA = createExoSchema((b) => {
            let value!: TExoTextPort;
            b.el('output', null, (out) => {
                value = out.textPort();
            });
            return { value };
        });
        const mStep = createExoMachine<
            TExoMachineNode,
            { by: number } | undefined,
            { value: number }
        >(STEP_SCHEMA, { createInitialState: () => ({ value: 0 }) });
        const stepping = withExoTransitions(mStep, {
            step: (c) => {
                const state = c.state;
                state.value += 1;
                c.text(STEP_SCHEMA.ports.value, state.value);
            },
        });
        const STEP = withExoWire(stepping, (c, params) => {
            const by = params?.by;
            c.transitionOverrides =
                by === undefined
                    ? null
                    : stepping.overrides({
                          step: (node: TExoMachineNode) => {
                              const state = node.state as { value: number };
                              state.value += by;
                              node.text(STEP_SCHEMA.ports.value, state.value);
                          },
                      });
        });
        const { step } = STEP.transitions;
        const plain = document.createElement('div');
        let plainNode!: TExoMachineNode;
        let byTenNode!: TExoMachineNode;
        const HOST_SCHEMA = createExoSchema((b) => {
            let a!: TExoChildrenPort;
            let z!: TExoChildrenPort;
            b.el('div', null, (div) => {
                div.el('i', null, (i) => {
                    a = i.childrenPort();
                });
                div.el('u', null, (u) => {
                    z = u.childrenPort();
                });
            });
            return { a, z };
        });
        const HOST = createExoMachine<TExoDomNode>(HOST_SCHEMA, {
            createInitialState: (c) => {
                plainNode = c.one(HOST_SCHEMA.ports.a, STEP as never) as unknown as TExoMachineNode;
                byTenNode = c.one(HOST_SCHEMA.ports.z, STEP as never, {
                    by: 10,
                }) as unknown as TExoMachineNode;
            },
        });
        BACKEND.render(HOST, plain);
        step(plainNode);
        step(byTenNode);
        expect(plain.textContent).toBe('110');
    });

    it('lets c.on in the wire win over the machine handler on the same port', () => {
        const fired: string[] = [];
        const BUTTON = composeExoMachine(
            createExoMachine<TExoMachineNode>(CARD_SCHEMA),
            (m) =>
                withExoHandlers(m, (on) => {
                    on(CARD_SCHEMA.ports.click, () => fired.push('machine'));
                }),
            (m) =>
                withExoWire(m, (c) => {
                    c.on(CARD_SCHEMA.ports.click, () => fired.push('wire'));
                })
        );
        const parent = document.createElement('div');
        BACKEND.render(BUTTON, parent);
        parent.querySelector('button')?.click();
        expect(fired).toEqual(['wire']);
    });

    it('refuses a structural door in a re-run wire', () => {
        const BOX_SCHEMA = createExoSchema((b) => {
            let slot!: TExoChildrenPort;
            b.el('div', null, (div) => {
                slot = div.childrenPort();
            });
            return { slot };
        });
        const mBox = createExoMachine<TExoDomNode>(BOX_SCHEMA);
        const BOX = composeExoMachine(mBox, (m) =>
            withExoWire(m, (c) => {
                c.childList(BOX_SCHEMA.ports.slot);
            })
        );
        let box!: TExoDomNode;
        const HOST = createExoMachine<TExoDomNode>(BOX_SCHEMA, {
            createInitialState: (c) => {
                box = c.one(BOX_SCHEMA.ports.slot, BOX);
            },
        });
        BACKEND.render(HOST, document.createElement('div'));
        expect(() => wireExoNode(box, BOX)).toThrow(/re-ran/);
    });

    it('arms a child built inside a re-run wire as a first run, so it may open its child list', () => {
        const BOX_SCHEMA = createExoSchema((b) => {
            let slot!: TExoChildrenPort;
            b.el('div', null, (div) => {
                slot = div.childrenPort();
            });
            return { slot };
        });
        const mLeaf = createExoMachine<TExoDomNode>(BOX_SCHEMA, {
            createInitialState: (c) => c.childList(BOX_SCHEMA.ports.slot),
        });
        const LEAF = mLeaf;
        const mHost = createExoMachine<TExoDomNode, number>(BOX_SCHEMA, {
            createInitialState: (c) => c.childList(BOX_SCHEMA.ports.slot),
        });
        const HOST = composeExoMachine(mHost, (m) =>
            withExoWire(m, (c, count) => {
                const rows = c.state as ReturnType<TExoDomNode['childList']>;
                while (rows.size < count) rows.insert(c.build(LEAF));
                if (count > 1) expect(() => c.childList(BOX_SCHEMA.ports.slot)).toThrow(/re-ran/);
            })
        );
        let host!: TExoDomNode;
        const ROOT = createExoMachine<TExoDomNode>(BOX_SCHEMA, {
            createInitialState: (c) => {
                host = c.one(BOX_SCHEMA.ports.slot, HOST, 1);
            },
        });
        const parent = document.createElement('div');
        BACKEND.render(ROOT, parent);
        wireExoNode(host, HOST, 3);
        expect(parent.querySelectorAll('div > div > div > div')).toHaveLength(3);
    });
});
