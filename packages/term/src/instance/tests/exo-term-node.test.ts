// Every call on the exported connector surface, exercised against this backend: the rest of
// `TExoChildrenWiring` beyond what the README components use, plus the two refusals this backend
// inherits from `@exodra/core`'s shared rules and the two it invents for itself.
//
// EVERY WIRE BELOW IS TYPED AGAINST `TExoWiring` OR `TExoChildrenWiring` and never against
// `TExoTermNode`, for the same reason the fixtures are: a test that types its wires against the
// backend it is testing proves nothing about portability.
import { exoContextToken } from '@exodra/context';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
    destroyExoNode,
    wireExoNode,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoChildrenWiring,
    TExoEventHandler,
    TExoWiring,
    TExoNode,
    TExoFillDoors,
    TExoAttrPort,
    TExoTextPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoMachineInitialState,
    TExoMachineNode,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import type { TExoTermElement } from '../types/TExoTermElement';
import type { TExoTermEvent } from '../../utilities/types/TExoTermEvent';
import { exoTermFind } from '../../utilities/exoTermFind';
import { exoTermFire } from '../../utilities/exoTermFire';
import { createExoTestMachine, source } from '@exodra/test-utils';

/**
 * ONE BACKEND FOR THE FILE, AT MODULE LOAD. The schema cache is keyed on the backend by pointer, so
 * a `new ExoTermBackend()` per test would recompile every schema below per test — silently, since
 * the output is identical either way. Composed with NO PACKS, which is the case that has to keep
 * working: the shipped connector surface is itself a pack, merged first by the constructor.
 */
const BACKEND = new ExoTermBackend();

const LEAF = createExoTestMachine(
    (b) => {
        let text!: TExoTextPort;
        b.el('span', { class: 'leaf' }, (span) => {
            text = span.textPort();
        });
        return { text };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, text) => {
            c.text(P.text, text);
        }
);

const OTHER = createExoTestMachine(
    (b) => {
        let text!: TExoTextPort;
        b.el('em', null, (em) => {
            text = em.textPort();
        });
        return { text };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, text) => {
            c.text(P.text, text);
        }
);

/**
 * A machine exonode on the portable surface: what a machine that follows a source is typed against,
 * since an effect and a transition need the instance's state fields as well as its doors.
 */
type TExoFollowing = TExoWiring & TExoMachineNode;

/** What `LIVE` below follows, and what it writes when it is disposed — the two things a child
 *  out of the tree can be asked about from here. */
const LIVE_TEXT = source('live');
const DISPOSED: string[] = [];

const LIVE_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('i', null, (i) => {
        text = i.textPort();
    });
    return { text };
});
const mLive = createExoMachine<TExoFollowing>(LIVE_SCHEMA, {
    createInitialState: (c) => {
        c.onTeardown(() => {
            DISPOSED.push('live');
        });
        return null;
    },
});
const LIVE = composeExoMachine(
    mLive,
    (m) =>
        withExoTransitions(m, {
            showLive: (c) => c.text(LIVE_SCHEMA.ports.text, LIVE_TEXT.getValue()),
        }),
    (m) => {
        const { showLive } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showLive(c);
                return LIVE_TEXT.onChange(() => showLive(c));
            });
        });
    }
);

type TExoPlacing = TExoChildrenWiring & TExoMachineNode;

/** A shell with one children port, so each test below only has to supply a wire. */
function shell(wire: (ports: { slot: TExoChildrenPort }) => TExoMachineInitialState<TExoPlacing>) {
    return createExoTestMachine((b) => {
        let slot!: TExoChildrenPort;
        b.el('div', null, (div) => {
            slot = div.childrenPort();
        });
        return { slot };
    }, wire);
}

describe('a row whose wire throws', () => {
    it('runs the teardowns it registered before it threw', () => {
        const ran: string[] = [];
        const BOOM = createExoTestMachine(
            (b) => {
                let text!: TExoTextPort;
                b.el('span', null, (span) => {
                    text = span.textPort();
                });
                return { text };
            },
            (): TExoMachineInitialState<TExoWiring> => (c) => {
                c.onTeardown(() => ran.push('first'));
                c.onTeardown(() => ran.push('second'));
                throw new Error('wire exploded');
            }
        );
        const PAGE = shell((P) => (c) => {
            c.one(P.slot, BOOM);
        });

        expect(() => BACKEND.renderScreen(PAGE, 1)).toThrow('wire exploded');
        expect(ran).toEqual(['first', 'second']);
    });
});

describe('the children half of the surface', () => {
    it('one() mounts a single nested instance', () => {
        const PAGE = shell((P) => (c) => {
            c.one(P.slot, LEAF, 'nested');
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "nested"'].join('\n'));
        screen.dispose();
    });

    it('list() mounts a fixed list and never reconciles it', () => {
        const PAGE = shell((P) => (c) => {
            c.list(P.slot, LEAF, ['a', 'b']);
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "a"', '  span class="leaf" "b"'].join('\n')
        );
        screen.dispose();
    });

    it('moveChild() keeps the instances it reorders — a move is not a rebuild', () => {
        let node!: TExoPlacing;
        let slot!: TExoChildrenPort;
        const PAGE = shell((P) => (c) => {
            node = c;
            slot = P.slot;
            c.appendChild(P.slot, wireExoNode(c.createExoNode(LEAF), 'a'));
            c.appendChild(P.slot, wireExoNode(c.createExoNode(LEAF), 'b'));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "a"', '  span class="leaf" "b"'].join('\n')
        );
        const first = node.childAt(slot, 0);
        const second = node.childAt(slot, 1);

        node.moveChild(first as TExoNode, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "b"', '  span class="leaf" "a"'].join('\n')
        );
        // The same two instances, in the other order.
        expect(node.childAt(slot, 0)).toBe(second);
        expect(node.childAt(slot, 1)).toBe(first);

        destroyExoNode(node.childAt(slot, 0) as TExoNode);
        expect(node.childCount(slot)).toBe(1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "a"'].join('\n'));
        screen.dispose();
    });

    it('swaps WHICH COMPONENT stands in a position, and takes the position away', () => {
        let node!: TExoPlacing;
        let slot!: TExoChildrenPort;
        const PAGE = shell((P) => (c) => {
            node = c;
            slot = P.slot;
            c.appendChild(P.slot, wireExoNode(c.createExoNode(LEAF), 'first'));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "first"'].join('\n'));

        // A POSITION IS NOT TYPED BY A COMPONENT: the port takes whatever `createExoNode` returns, so
        // changing which component stands there is two commands and no reconciler.
        destroyExoNode(node.childAt(slot, 0) as TExoNode);
        node.appendChild(slot, wireExoNode(node.createExoNode(OTHER), 'second'));
        expect(screen.text()).toBe(['div', '  em "second"'].join('\n'));

        destroyExoNode(node.childAt(slot, 0) as TExoNode);
        expect(screen.text()).toBe('div');
        screen.dispose();
    });

    it('takes children of DIFFERENT components in one port, in insertion order', () => {
        let node!: TExoPlacing;
        let slot!: TExoChildrenPort;
        const PAGE = shell((P) => (c) => {
            node = c;
            slot = P.slot;
            c.appendChild(P.slot, wireExoNode(c.createExoNode(OTHER), 'two'));
            c.insertChild(P.slot, wireExoNode(c.createExoNode(LEAF), 'one'), 0);
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "one"', '  em "two"'].join('\n'));

        destroyExoNode(node.childAt(slot, 1) as TExoNode);
        destroyExoNode(node.childAt(slot, 0) as TExoNode);
        node.appendChild(slot, wireExoNode(node.createExoNode(OTHER), 'only'));
        expect(screen.text()).toBe(['div', '  em "only"'].join('\n'));
        screen.dispose();
    });

    it('removeChild() takes a child out without telling it, so its subscriptions stay live', () => {
        LIVE_TEXT.setValue('before');
        DISPOSED.length = 0;
        let node!: TExoPlacing;
        let slot!: TExoChildrenPort;
        const PAGE = shell((P) => (c) => {
            node = c;
            slot = P.slot;
            c.appendChild(P.slot, wireExoNode(c.createExoNode(LEAF), 'kept'));
            c.appendChild(P.slot, wireExoNode(c.createExoNode(LIVE)));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "kept"', '  i "before"'].join('\n')
        );

        const taken = node.removeChild(node.childAt(slot, 1) as TExoNode);
        expect(screen.text()).toBe(['div', '  span class="leaf" "kept"'].join('\n'));
        expect(DISPOSED).toEqual([]);

        // THE CLAIM: it was never told it left, so the source still reaches it while it is out.
        LIVE_TEXT.setValue('after');
        node.appendChild(slot, taken);
        expect(node.childAt(slot, 1)).toBe(taken);
        expect(screen.text()).toBe(['div', '  span class="leaf" "kept"', '  i "after"'].join('\n'));
        screen.dispose();
    });

    it('destroyExoNode() disposes the child it takes out', () => {
        LIVE_TEXT.setValue('here');
        DISPOSED.length = 0;
        let node!: TExoPlacing;
        let slot!: TExoChildrenPort;
        const PAGE = shell((P) => (c) => {
            node = c;
            slot = P.slot;
            c.appendChild(P.slot, wireExoNode(c.createExoNode(LIVE)));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  i "here"'].join('\n'));

        destroyExoNode(node.childAt(slot, 0) as TExoNode);
        expect(DISPOSED).toEqual(['live']);
        expect(screen.text()).toBe('div');
        screen.dispose();
    });
});

describe('contexts on a RETAINED backend', () => {
    const THEME = exoContextToken<string>('exo.term.test.theme');

    const THEMED_ROW = createExoTestMachine(
        (b) => {
            let text!: TExoTextPort;
            b.el('li', null, (li) => {
                text = li.textPort();
            });
            return { text };
        },
        (P): TExoMachineInitialState<TExoWiring> =>
            (c, text) => {
                c.text(P.text, String(text) + ':' + (c.inject(THEME) ?? 'none'));
            }
    );

    it('a row added AFTER the first render still sees what its parent provided', () => {
        let node!: TExoPlacing;
        let rows!: TExoChildrenPort;
        const PAGE = createExoTestMachine(
            (b) => {
                let slot!: TExoChildrenPort;
                b.el('ul', null, (ul) => {
                    slot = ul.childrenPort();
                });
                return { slot };
            },
            (P): TExoMachineInitialState<TExoPlacing> =>
                (c) => {
                    c.provide(THEME, 'dark');
                    node = c;
                    rows = P.slot;
                    c.appendChild(P.slot, wireExoNode(c.createExoNode(THEMED_ROW), 'a'));
                }
        );

        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['ul', '  li "a:dark"'].join('\n'));

        // THE WHOLE POINT. This row is built long after the wire that provided the value
        // returned, at a moment when the module-level context head is back to null. A backend
        // that kept only a module-level head — which is all `@exodra/string` needs — prints
        // `b:none` here.
        node.appendChild(rows, wireExoNode(node.createExoNode(THEMED_ROW), 'b'));
        expect(screen.text()).toBe(['ul', '  li "a:dark"', '  li "b:dark"'].join('\n'));
        screen.dispose();
    });
});

describe('attributes, events, and what this backend refuses', () => {
    it('writes attributes under their MARKUP spelling and takes absent ones out', () => {
        const PAGE = createExoTestMachine(
            (b) => {
                let cls!: TExoAttrPort;
                let flag!: TExoAttrPort;
                b.el('div', null, (div) => {
                    cls = div.port('class');
                    flag = div.port('data-flag');
                });
                return { cls, flag };
            },
            (P): TExoMachineInitialState<TExoWiring> =>
                (c) => {
                    c.attr(P.cls, 'card');
                    c.attr(P.flag, true);
                }
        );
        const screen = BACKEND.renderScreen(PAGE, 1);
        // `className` prints as `class`, exactly as `exoAttribute` makes it print on the
        // server; `true` is the empty value a boolean attribute has in markup.
        expect(screen.text()).toBe('div class="card" data-flag=""');
        screen.dispose();
    });

    it('an attribute set to false/null/undefined is ABSENT, not the string "false"', () => {
        const values = source<unknown>(false);
        const schema = createExoSchema((b) => {
            let flag!: TExoAttrPort;
            b.el('div', null, (div) => {
                flag = div.port('disabled');
            });
            return { flag };
        });
        const m = createExoMachine<TExoFollowing>(schema);
        const PAGE = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    show: (c) => c.attr(schema.ports.flag, values.getValue()),
                }),
            (m) => {
                const { show } = m.transitions;
                return withExoEffects(m, (effect) => {
                    effect((c) => {
                        show(c);
                        return values.onChange(() => show(c));
                    });
                });
            }
        );
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe('div');
        values.setValue(true);
        expect(screen.text()).toBe('div disabled=""');
        values.setValue(null);
        expect(screen.text()).toBe('div');
        screen.dispose();
    });

    it('a handler writes the subject it was handed, and the followed text follows', () => {
        const done = source(false);
        const subject = { done };
        const TOGGLE_DONE: TExoEventHandler = (_event, given) => {
            const cell = (given as typeof subject).done;
            cell.setValue(cell.getValue() === true ? false : true);
        };
        const schema = createExoSchema((b) => {
            let click!: TExoEventPort;
            let text!: TExoTextPort;
            b.el('button', null, (button) => {
                click = button.eventPort('click');
                text = button.textPort();
            });
            return { click, text };
        });
        const m = createExoMachine<TExoFollowing>(schema);
        const PAGE = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    show: (c) => c.text(schema.ports.text, done.getValue()),
                }),
            (m) =>
                withExoWire(m, (c) => {
                    c.on(schema.ports.click, TOGGLE_DONE, subject);
                }),
            (m) => {
                const { show } = m.transitions;
                return withExoEffects(m, (effect) => {
                    effect((c) => {
                        show(c);
                        return done.onChange(() => show(c));
                    });
                });
            }
        );
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe('button on:click "false"');
        exoTermFire(screen.roots[0], 'click');
        expect(done.getValue()).toBe(true);
        expect(screen.text()).toBe('button on:click "true"');
        screen.dispose();
    });

    it('a FUNCTION handler is given the subject too, so one function can serve every row', () => {
        /**
         * ONE FUNCTION FOR BOTH ROWS, held at this scope rather than built inside the wire — which
         * is the claim. `TExoTermNode.on` records `{ handler, subject }` with no branch on the
         * form, and `exoTermFire` passes the subject on, so a per-row closure is not the only way to
         * say which row.
         */
        const told: unknown[] = [];
        // THE TERM BACKEND'S OWN EVENT, not the DOM's. Before the pair became generic this had
        // to say `Event`, and `exoTermFire` cast a fabricated object through it.
        const RECORD = (_event: TExoTermEvent, subject?: unknown): void => {
            told.push(subject);
        };
        const rows = [{ tag: 'first' }, { tag: 'second' }];
        const PAGE = createExoTestMachine(
            (b) => {
                let click!: TExoEventPort;
                b.el('button', null, (button) => {
                    click = button.eventPort('click');
                });
                return { click };
            },
            (P): TExoMachineInitialState<TExoWiring<TExoTermEvent, TExoTermElement>> =>
                (c, row) => {
                    c.on(P.click, RECORD, row);
                }
        );
        const first = BACKEND.renderScreen(PAGE, 1, rows[0]);
        const second = BACKEND.renderScreen(PAGE, 1, rows[1]);
        exoTermFire(second.roots[0], 'click');
        exoTermFire(first.roots[0], 'click');
        // BY IDENTITY: each row's own subject, out of the record its own fill wrote.
        expect(told).toEqual([rows[1], rows[0]]);
        first.dispose();
        second.dispose();
    });

    it('on() names TExoEventPort, and a cast past it lands on the missing event name', () => {
        // The kind compare is gone from every backend's `on`; the parameter type is the refusal,
        // and `packages/type-tests`' `port-kind-doors.ts` is where it is offered a text port and
        // rejected. This backend keeps a second refusal that a cast still meets, because a text
        // port has no entry in `names` — which is EXO0069 and not the retired EXO0024.
        const BAD = createExoTestMachine(
            (b) => {
                let text!: TExoTextPort;
                b.el('span', null, (span) => {
                    text = span.textPort();
                });
                return { text };
            },
            (P): TExoMachineInitialState<TExoWiring> =>
                (c) => {
                    c.on(P.text as unknown as TExoEventPort, () => undefined);
                }
        );
        expect(() => BACKEND.renderScreen(BAD, 1)).toThrow(
            /an event port with no name cannot be listened for/
        );
    });

    it('refuses a void element with content, as both shipped compilers do', () => {
        const BAD = createExoTestMachine(
            (b) => {
                b.el('br', null, (br) => {
                    br.text('nope');
                });
                return {};
            },
            (): TExoMachineInitialState<TExoWiring> => () => undefined
        );
        expect(() => BACKEND.renderScreen(BAD, 1)).toThrow(/void element/);
    });

    it('prints static text after a children port after the rows', () => {
        const PAGE = createExoTestMachine(
            (b) => {
                let slot!: TExoChildrenPort;
                b.el('div', null, (div) => {
                    slot = div.childrenPort();
                    div.text('after');
                });
                return { slot };
            },
            (P): TExoMachineInitialState<TExoChildrenWiring> =>
                (c) => {
                    c.list(P.slot, LEAF, ['x']);
                }
        );
        expect(BACKEND.renderScreen(PAGE, 1).text()).toBe(
            ['div', '  span class="leaf" "x"', '  "after"'].join('\n')
        );
    });

    it('finds nodes through regions, which a naive walk of kids would step over', () => {
        const PAGE = shell((P) => (c) => {
            c.one(P.slot, OTHER, 'deep');
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(exoTermFind(screen.roots[0], 'em')?.text).toBe('deep');
        expect(exoTermFind(screen.roots[0], 'nothing')).toBeNull();
        screen.dispose();
    });
});

/** What the wires below assume about a connector, and nothing more. */
type TDriving = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    fillDoors(): TExoFillDoors;
};

/** One element, one attribute port — shared so two wires can be compared over the same schema. */
function buildCard(b: TExoSchemaCursor) {
    let cls!: TExoAttrPort;
    b.el('div', null, (div) => {
        cls = div.port('class');
    });
    return { cls };
}

/**
 * Driving a port by hand — `c.fillDoors()`, which on this backend is `writers[i]` over `nodes[i]` with
 * no port→slot table between them, so a fill is two array loads and a call. One object per driving
 * instance, and nothing at all for a wire that never asks.
 *
 * THERE IS NO FILL RECORD TO TEST: this backend has no sweep of unfilled ports — a port a wire skips
 * is simply never written — so nothing about one can be asserted from outside.
 */
describe('driving a port by hand', () => {
    it('writes exactly what `set` writes', () => {
        const VIA_SET = createExoTestMachine(
            buildCard,
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    c.attr(P.cls, 'card');
                }
        );
        const VIA_PORTS = createExoTestMachine(
            buildCard,
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    c.fillDoors().attr(P.cls, 'card');
                }
        );

        const withSet = BACKEND.renderScreen(VIA_SET, 1);
        const withPorts = BACKEND.renderScreen(VIA_PORTS, 1);
        expect(withPorts.text()).toBe(withSet.text());
        expect(withPorts.text()).toBe('div class="card"');
        withSet.dispose();
        withPorts.dispose();
    });

    it('hands each instance its own value, after another instance has been wired', () => {
        const seen: TExoFillDoors[] = [];
        const CLASSES = ['a', 'b'];
        const ROW = createExoTestMachine(
            (b) => {
                let cls!: TExoAttrPort;
                b.el('span', null, (span) => {
                    cls = span.port('class');
                });
                return { cls };
            },
            (P): TExoMachineInitialState<TDriving> =>
                (c, cls) => {
                    const p = c.fillDoors();
                    p.attr(P.cls, cls);
                    seen.push(p);
                }
        );
        const PAGE = shell((P) => (c) => {
            c.list(P.slot, ROW, CLASSES);
        });

        const screen = BACKEND.renderScreen(PAGE, 1);

        expect(screen.text()).toBe(['div', '  span class="a"', '  span class="b"'].join('\n'));
        // TWO ROWS SHARE ONE CONNECTOR AT ONE DEPTH, and each was handed its own table. A value
        // that wrapped the connector, or resolved the node lazily, would fail here.
        expect(seen[0]).not.toBe(seen[1]);
        screen.dispose();
    });
});
