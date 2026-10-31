// Every call on the exported connector surface, exercised against this backend: the rest of
// `TExoChildrenWiring` beyond what the README components use, plus the two refusals this backend
// inherits from `@exodra/core`'s shared rules and the two it invents for itself.
//
// EVERY WIRE BELOW IS TYPED AGAINST `TExoWiring` OR `TExoChildrenWiring` and never against
// `TExoTermNode`, for the same reason the fixtures are: a test that types its wires against the
// backend it is testing proves nothing about portability.
import { exoContextToken } from '@exodra/context';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
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

/** What the rows below read, by INDEX: a wire is handed its position and nothing else, so the data
 *  a row shows is the caller's to put where the row can reach it. */
const LEAF_TEXTS: string[] = [];
const OTHER_TEXTS: string[] = [];

const LEAF = createExoTestMachine(
    (b) => {
        let text!: TExoTextPort;
        b.el('span', { class: 'leaf' }, (span) => {
            text = span.textPort();
        });
        return { text };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, i) => {
            c.text(P.text, LEAF_TEXTS[i]);
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
        (c, i) => {
            c.text(P.text, OTHER_TEXTS[i]);
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
const mLive = createExoMachineBuilder<TExoFollowing>(LIVE_SCHEMA);
mLive.createInitialState((c, i) => {
    c.onTeardown(() => {
        DISPOSED.push('live' + i);
    });
    return null;
});
const showLive = mLive.transition((c) => c.text(LIVE_SCHEMA.ports.text, LIVE_TEXT.getValue()));
mLive.effect((c) => {
    showLive(c);
    return LIVE_TEXT.onChange(() => showLive(c));
});
const LIVE = mLive.done();

/**
 * WHAT A WIRE THAT PLACES CHILDREN BY HAND ASSUMES. `childList` is each backend's own door — it
 * hands out element positions, which `@exodra/core` has no word for — so a portable wire names the
 * commands it calls over core's opaque `TExoNode` and no backend's node type.
 */
type TExoPlacing = TExoChildrenWiring &
    TExoMachineNode & {
        childList(port: TExoChildrenPort): TExoPlacedChildren;
    };

type TExoPlacedChildren = {
    readonly size: number;
    at(i: number): TExoNode | undefined;
    insert(child: TExoNode, i?: number): void;
    remove(i: number): void;
    detach(i: number): TExoNode | undefined;
    detachAll(): readonly TExoNode[];
    move(from: number, to: number): void;
};

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
        LEAF_TEXTS[0] = 'nested';
        const PAGE = shell((P) => (c) => {
            c.one(P.slot, LEAF);
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "nested"'].join('\n'));
        screen.dispose();
    });

    it('list() mounts a fixed list and never reconciles it', () => {
        LEAF_TEXTS[0] = 'a';
        LEAF_TEXTS[1] = 'b';
        const PAGE = shell((P) => (c) => {
            c.list(P.slot, LEAF, 2);
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "a"', '  span class="leaf" "b"'].join('\n')
        );
        screen.dispose();
    });

    it('move() keeps the instances it reorders — a move is not a rebuild', () => {
        LEAF_TEXTS[0] = 'a';
        LEAF_TEXTS[1] = 'b';
        let rows!: TExoPlacedChildren;
        const PAGE = shell((P) => (c) => {
            rows = c.childList(P.slot);
            rows.insert(c.build(LEAF, 0));
            rows.insert(c.build(LEAF, 1));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "a"', '  span class="leaf" "b"'].join('\n')
        );
        const first = rows.at(0);
        const second = rows.at(1);

        rows.move(0, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "b"', '  span class="leaf" "a"'].join('\n')
        );
        // The same two instances, in the other order.
        expect(rows.at(0)).toBe(second);
        expect(rows.at(1)).toBe(first);

        rows.remove(0);
        expect(rows.size).toBe(1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "a"'].join('\n'));
        screen.dispose();
    });

    it('swaps WHICH COMPONENT stands in a position, and takes the position away', () => {
        LEAF_TEXTS[0] = 'first';
        OTHER_TEXTS[0] = 'second';
        let node!: TExoPlacing;
        let slot!: TExoPlacedChildren;
        const PAGE = shell((P) => (c) => {
            node = c;
            slot = c.childList(P.slot);
            slot.insert(c.build(LEAF, 0));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "first"'].join('\n'));

        // A POSITION IS NOT TYPED BY A COMPONENT: the port takes whatever `build` returns, so
        // changing which component stands there is two commands and no reconciler.
        slot.remove(0);
        slot.insert(node.build(OTHER, 0));
        expect(screen.text()).toBe(['div', '  em "second"'].join('\n'));

        slot.remove(0);
        expect(screen.text()).toBe('div');
        screen.dispose();
    });

    it('takes children of DIFFERENT components in one port, in insertion order', () => {
        LEAF_TEXTS[0] = 'one';
        OTHER_TEXTS[0] = 'two';
        OTHER_TEXTS[1] = 'only';
        let node!: TExoPlacing;
        let slot!: TExoPlacedChildren;
        const PAGE = shell((P) => (c) => {
            node = c;
            slot = c.childList(P.slot);
            slot.insert(c.build(OTHER, 0));
            slot.insert(c.build(LEAF, 0), 0);
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "one"', '  em "two"'].join('\n'));

        slot.remove(1);
        slot.remove(0);
        slot.insert(node.build(OTHER, 1));
        expect(screen.text()).toBe(['div', '  em "only"'].join('\n'));
        screen.dispose();
    });

    it('detach() takes a child out without telling it, so its subscriptions stay live', () => {
        LEAF_TEXTS[0] = 'kept';
        LIVE_TEXT.setValue('before');
        DISPOSED.length = 0;
        let slot!: TExoPlacedChildren;
        const PAGE = shell((P) => (c) => {
            slot = c.childList(P.slot);
            slot.insert(c.build(LEAF, 0));
            slot.insert(c.build(LIVE, 0));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(
            ['div', '  span class="leaf" "kept"', '  i "before"'].join('\n')
        );

        const taken = slot.detach(1);
        expect(screen.text()).toBe(['div', '  span class="leaf" "kept"'].join('\n'));
        expect(DISPOSED).toEqual([]);

        // THE CLAIM: it was never told it left, so the source still reaches it while it is out.
        LIVE_TEXT.setValue('after');
        slot.insert(taken as TExoNode);
        expect(slot.at(1)).toBe(taken);
        expect(screen.text()).toBe(['div', '  span class="leaf" "kept"', '  i "after"'].join('\n'));
        screen.dispose();
    });

    it('remove() disposes the child it takes out', () => {
        LIVE_TEXT.setValue('here');
        DISPOSED.length = 0;
        let slot!: TExoPlacedChildren;
        const PAGE = shell((P) => (c) => {
            slot = c.childList(P.slot);
            slot.insert(c.build(LIVE, 0));
        });
        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['div', '  i "here"'].join('\n'));

        slot.remove(0);
        expect(DISPOSED).toEqual(['live0']);
        expect(screen.text()).toBe('div');
        screen.dispose();
    });
});

describe('contexts on a RETAINED backend', () => {
    const THEME = exoContextToken<string>('exo.term.test.theme');
    const THEMED_TEXTS: string[] = [];

    const THEMED_ROW = createExoTestMachine(
        (b) => {
            let text!: TExoTextPort;
            b.el('li', null, (li) => {
                text = li.textPort();
            });
            return { text };
        },
        (P): TExoMachineInitialState<TExoWiring> =>
            (c, i) => {
                c.text(P.text, THEMED_TEXTS[i] + ':' + (c.inject(THEME) ?? 'none'));
            }
    );

    it('a row added AFTER the first render still sees what its parent provided', () => {
        THEMED_TEXTS[0] = 'a';
        THEMED_TEXTS[1] = 'b';
        let node!: TExoPlacing;
        let rows!: TExoPlacedChildren;
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
                    rows = c.childList(P.slot);
                    rows.insert(c.build(THEMED_ROW, 0));
                }
        );

        const screen = BACKEND.renderScreen(PAGE, 1);
        expect(screen.text()).toBe(['ul', '  li "a:dark"'].join('\n'));

        // THE WHOLE POINT. This row is built long after the wire that provided the value
        // returned, at a moment when the module-level context head is back to null. A backend
        // that kept only a module-level head — which is all `@exodra/string` needs — prints
        // `b:none` here.
        rows.insert(node.build(THEMED_ROW, 1));
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
        const m = createExoMachineBuilder<TExoFollowing>(schema);
        const show = m.transition((c) => c.attr(schema.ports.flag, values.getValue()));
        m.effect((c) => {
            show(c);
            return values.onChange(() => show(c));
        });
        const PAGE = m.done();
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
        const m = createExoMachineBuilder<TExoFollowing>(schema);
        const show = m.transition((c) => c.text(schema.ports.text, done.getValue()));
        m.wire((c) => {
            c.on(schema.ports.click, TOGGLE_DONE, subject);
        });
        m.effect((c) => {
            show(c);
            return done.onChange(() => show(c));
        });
        const PAGE = m.done();
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
                (c, i) => {
                    c.on(P.click, RECORD, rows[i]);
                }
        );
        const screen = BACKEND.renderScreen(PAGE, 2);
        exoTermFire(screen.roots[1], 'click');
        exoTermFire(screen.roots[0], 'click');
        // BY IDENTITY: each row's own subject, out of the record its own fill wrote.
        expect(told).toEqual([rows[1], rows[0]]);
        screen.dispose();
    });

    it('html() refuses a children port, naming the call that works', () => {
        const BAD_CHILDREN = shell((P) => (c) => {
            c.unsafeHtml(P.slot, '<b>raw</b>');
        });
        // `@exodra/string` ACCEPTS this one when the port owns its element — the value is raw
        // markup and `innerHTML` is its browser counterpart. There is no counterpart here.
        expect(() => BACKEND.renderScreen(BAD_CHILDREN, 1)).toThrow(/CHILDREN port/);
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

    it('refuses static text after a children port, though its own shape is unambiguous', () => {
        // THE SHARED RULE THAT ENCODES ANOTHER BACKEND'S LIMITATION. A region here is a
        // container, so rows could not possibly land on the wrong side of this text. It is
        // refused so that a schema is accepted or refused identically everywhere — see
        // `compileExoTermSchema`.
        const BAD = createExoTestMachine(
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
                    c.list(P.slot, LEAF, 0);
                }
        );
        expect(() => BACKEND.renderScreen(BAD, 1)).toThrow(/children port/);
    });

    it('finds nodes through regions, which a naive walk of kids would step over', () => {
        OTHER_TEXTS[0] = 'deep';
        const PAGE = shell((P) => (c) => {
            c.one(P.slot, OTHER);
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
                (c, i) => {
                    const p = c.fillDoors();
                    p.attr(P.cls, CLASSES[i]);
                    seen.push(p);
                }
        );
        const PAGE = shell((P) => (c) => {
            c.list(P.slot, ROW, 2);
        });

        const screen = BACKEND.renderScreen(PAGE, 1);

        expect(screen.text()).toBe(['div', '  span class="a"', '  span class="b"'].join('\n'));
        // TWO ROWS SHARE ONE CONNECTOR AT ONE DEPTH, and each was handed its own table. A value
        // that wrapped the connector, or resolved the node lazily, would fail here.
        expect(seen[0]).not.toBe(seen[1]);
        screen.dispose();
    });
});
