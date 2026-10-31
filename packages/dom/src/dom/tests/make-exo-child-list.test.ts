// @vitest-environment jsdom
//
// A CHILDREN PORT WRITTEN BY COMMANDS — `c.childList(port)`, which is `bindChildren` taken apart the
// way `c.fillDoors()` is `bind` taken apart.
//
// WHAT IS BEING CLAIMED, AND WHAT EACH TEST HERE HOLDS DOWN:
//
//  1. THE COMMANDS AND THE DIFF PRODUCE THE SAME TREE. The reconciler still runs its own loops —
//     routing a diff through three closures would put an indirect call on the per-child path of the
//     most-measured axis here — so "the same primitives" is a claim about `insertBefore`,
//     `dropExoChild` and `order`, and it is worth nothing unless the two agree on the OUTPUT. The
//     first test drives one child list by hand and binds another to a source, and diffs the markup.
//  2. THE CHILD LIST IS BOUNDED. A children port is declared on an element but is not always the whole
//     of it. `append` here means "at the child list's end", not `parent.appendChild` — and the static
//     sibling standing behind the child list is what catches the difference.
//  3. REMOVAL RUNS `unmount`. That is what ends a child's subscriptions and, under a node source
//     that takes elements back, what offers its element to the pile. A `remove` written as
//     `removeChild` would leave both behind and nothing visible would change.
//  4. `order` STAYS TRUE. It is the state a later diff and a later hydration reconcile against, so
//     a command that moves the DOM without moving `order` leaves the next reconcile working from
//     fiction. Asserted through `index`, which is what `dropExoChild` and the diff both read.
//  5. THE SECOND PAIR TELLS THE CHILD NOTHING. `attach`/`detach` move a node and an `order` entry
//     and run no hook of any kind — which is what lets a hidden block keep its element, its
//     subscriptions and its wiring across a hide. Asserted three ways, because "nothing happened" is
//     the easiest claim in this file to pass by accident: the hooks are overwritten and counted, a
//     live source is written to while the child is OUT of the document and the detached element must
//     still take the write, and the element that comes back must be the same OBJECT.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoNode,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

// THE CHILD LIST IS AN EXONODE METHOD — see `TExoDomNode.childList`. The cast below is this file's
// own: `TDriving` is a narrowed exonode shape the shells are written against, and `childList` lives
// on the full one.
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMark } from '../types/TExoDomMark';
import type { TExoDomChild } from '../types/TExoDomChild';
import type { TExoChildList } from '../types/TExoChildList';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/** What these wires assume about an exonode, and nothing more. */
type TDriving = {
    build(component: unknown, index?: number): TExoNode<TExoDomMark>;
};

/**
 * A SOURCE THAT CAN BE WRITTEN TO — the whole of the reactive layer these tests need, hand-rolled so
 * this file keeps depending on nothing but `@exodra/core` and this package.
 *
 * `onChange` does NOT fire on registration and the initial value comes from `getValue()`; a cell
 * that fired here would hide whether the effect draws the value at all.
 */
type TCell = {
    getValue(): unknown;
    onChange(update: (event: unknown) => void): () => void;
    setValue(next: string): void;
};

/** The cell the next BOUND_ROW will read. Published before `build`, because a wire is handed a
 *  number and cannot be handed a source. */
let BOUND_SOURCE: TCell;

const cell = (initial: string): TCell => {
    let value = initial;
    const listeners = new Set<(event: unknown) => void>();
    return {
        getValue: () => value,
        onChange(update: (event: unknown) => void): () => void {
            listeners.add(update);
            return (): void => {
                listeners.delete(update);
            };
        },
        setValue(next: string): void {
            value = next;
            for (const update of listeners) update(next);
        },
    };
};

/** What the rows read, BY INDEX. A wire is handed its position and nothing else, so the labels a
 *  test wants on screen are the test's to put here first. `rowOf` turns a label back into its
 *  index, so every call below still reads as `build('a')` did. */
const ROW_LABELS = ['a', 'b', 'c', 'z', 'x', 'y'];

/** One row: `<li>` carrying its label as text. */
const ROW = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('li', null, (li) => {
            label = li.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<{ text(port: TExoTextPort, value: unknown): void }> =>
        (c, i) => {
            c.text(P.label, ROW_LABELS[i]);
        }
);

/**
 * THE SAME ROW WITH A LIVE SUBSCRIPTION instead of a one-off write — the only shape that can answer
 * "did this child's bindings survive being taken out of the document", which is the question
 * `detach` exists to answer yes to.
 */
const BOUND_ROW_SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        label = li.textPort();
    });
    return { label };
});
const mBoundRow = createExoMachineBuilder<TExoDomNode, unknown, { cell: TCell }>(BOUND_ROW_SCHEMA);
mBoundRow.createInitialState(() => ({ cell: BOUND_SOURCE }));
const showBoundRow = mBoundRow.transition((c) => {
    c.text(BOUND_ROW_SCHEMA.ports.label, c.state.cell.getValue());
});
mBoundRow.effect((c) => {
    showBoundRow(c);
    return c.state.cell.onChange(() => showBoundRow(c));
});
const BOUND_ROW = mBoundRow.done();

/** Publishes the cell, then builds the row that reads it — the two halves of handing a source to a
 *  component that is handed only a number. */
const buildBound = (conn: TDriving, source: TCell): TExoNode<TExoDomMark> => {
    BOUND_SOURCE = source;
    return conn.build(BOUND_ROW, 0);
};

/**
 * The shell whose `<ul>` holds ONE children port and a static `<li>` behind it. The static sibling
 * is the boundary: every command below must land in front of it.
 */
const SHELL = (take: (r: TExoChildList, c: TDriving) => void) =>
    createExoTestMachine(
        (b) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
                ul.el('li', { class: 'tail' }, (li) => {
                    li.text('tail');
                });
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TDriving> =>
            (c) => {
                take((c as never as TExoDomNode).childList(P.rows), c);
            }
    );

/**
 * THE SAME SHELL WITH NOTHING ELSE IN THE `<ul>` — the port is its element's ONE AND ONLY child, so
 * `compileExoDomSchema` writes `ownsElement = 1` for it and `detachAll` is entitled to the one-call
 * clear. Every other shell in this file is deliberately NOT this shape.
 */
const OPEN_SHELL = (take: (r: TExoChildList, c: TDriving) => void) =>
    createExoTestMachine(
        (b) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TDriving> =>
            (c) => {
                take((c as never as TExoDomNode).childList(P.rows), c);
            }
    );

/**
 * A STATIC `<li>` ON EACH SIDE OF THE PORT — `kids.length === 3`, so `ownsElement` is 0 and a
 * one-call clear used here would take the heading and the footer with it. This is the shape that
 * catches an illegal fast path, and it is the reason the flag is read from the schema rather than
 * guessed from the document: at the moment `detachAll` runs, `order` holds the child list's children and
 * the parent holds two more nodes that are nobody's business.
 */
const SANDWICH_SHELL = (take: (r: TExoChildList, c: TDriving) => void) =>
    createExoTestMachine(
        (b) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                ul.el('li', { class: 'head' }, (li) => {
                    li.text('head');
                });
                rows = ul.childrenPort();
                ul.el('li', { class: 'tail' }, (li) => {
                    li.text('tail');
                });
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TDriving> =>
            (c) => {
                take((c as never as TExoDomNode).childList(P.rows), c);
            }
    );

/**
 * TWO CHILDREN PORTS SIDE BY SIDE AND NOTHING ELSE — the other way an element can be shared, and the
 * one no static sibling would catch. Neither port owns the element (`kids.length === 2`), the front
 * child list's end anchor is the CHAIN function rather than a fixed node, and a one-call clear on the
 * front would delete the back child list's rows while leaving the back child list's `order` describing them.
 */
const TWO_PORT_SHELL = (take: (front: TExoChildList, back: TExoChildList, c: TDriving) => void) =>
    createExoTestMachine(
        (b) => {
            let front!: TExoChildrenPort;
            let back!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                front = ul.childrenPort();
                back = ul.childrenPort();
            });
            return { front, back };
        },
        (P): TExoMachineInitialState<TDriving> =>
            (c) => {
                const cc = c as never as TExoDomNode;
                take(cc.childList(P.front), cc.childList(P.back), c);
            }
    );

const labels = (parent: Element): string[] =>
    Array.from(parent.querySelectorAll('li')).map((li) => li.textContent ?? '');

describe('a children port written by commands', () => {
    it('inserts at the child list end, in front of the static sibling behind it', () => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        EXO_BACKEND.render(
            SHELL((r, c) => {
                childList = r;
                conn = c;
            }),
            parent
        );

        expect(labels(parent)).toEqual(['tail']);

        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('a')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('b')));

        // THE ASSERTION THIS TEST EXISTS FOR: both landed BEFORE `tail`. A command written as
        // `parent.appendChild` would put them after it and the child list would have escaped.
        expect(labels(parent)).toEqual(['a', 'b', 'tail']);
        expect(childList.size).toBe(2);
    });

    it('inserts at an index, shifting the rest along', () => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        EXO_BACKEND.render(
            SHELL((r, c) => {
                childList = r;
                conn = c;
            }),
            parent
        );

        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('a')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('c')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('b')), 1);

        expect(labels(parent)).toEqual(['a', 'b', 'c', 'tail']);
        // `order` MOVED WITH THE DOM: a command that shifted the nodes and not the record would pass
        // the markup check above and fail here.
        for (let i = 0; i < childList.size; i++) {
            expect((childList.at(i) as unknown as TExoDomChild).node).toBe(
                parent.querySelectorAll('li')[i]
            );
        }
    });

    it('moves a child in both directions and keeps `order` with it', () => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        EXO_BACKEND.render(
            SHELL((r, c) => {
                childList = r;
                conn = c;
            }),
            parent
        );

        for (const t of ['a', 'b', 'c']) childList.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));
        const first = childList.at(0);

        childList.move(0, 2);
        expect(labels(parent)).toEqual(['b', 'c', 'a', 'tail']);
        // THE SAME CHILD, not a rebuilt one — a move that dropped and re-inserted would end this
        // child's subscriptions, and identity is the only thing that says which happened.
        expect(childList.at(2)).toBe(first);
        // CHECKED HERE, AFTER ONE MOVE, and not only after moving back: a check taken only at the
        // end of a there-and-back pair goes green on a command that never moved the record.
        for (let i = 0; i < childList.size; i++) {
            expect((childList.at(i) as unknown as TExoDomChild).node).toBe(
                parent.querySelectorAll('li')[i]
            );
        }

        childList.move(2, 0);
        expect(labels(parent)).toEqual(['a', 'b', 'c', 'tail']);
        for (let i = 0; i < childList.size; i++) {
            expect((childList.at(i) as unknown as TExoDomChild).node).toBe(
                parent.querySelectorAll('li')[i]
            );
        }
    });

    /**
     * THE APPEND BRANCH — the one where the child list owns its element and there is no anchor at all.
     *
     * WHAT IT COVERS AND WHAT IT CANNOT. Every other test here uses a shell with a static
     * `<li class=tail>` behind the child list, so `at` is always a real node and the null-anchor PATH is
     * never walked; this walks it. What it does NOT cover is the `appendChild` BRANCH, and that is
     * not a gap in the test: `insertBefore(x, null)` IS `appendChild(x)`, so the two spellings are
     * indistinguishable by any assertion. The branch is taken for cost — 200 of the benchmark app's
     * 240 child insertions land on a null anchor — and a cost is not something a test can hold
     * down. Deleting it leaves this file green, which was checked.
     */
    it('appends when the child list runs to the end of its parent', () => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        const OPEN = createExoTestMachine(
            (b) => {
                let rows!: TExoChildrenPort;
                b.el('ul', null, (ul) => {
                    rows = ul.childrenPort();
                });
                return { rows };
            },
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    childList = (c as never as TExoDomNode).childList(P.rows);
                    conn = c;
                }
        );
        EXO_BACKEND.render(OPEN, parent);

        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('a')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('b')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('z')), 0);

        expect(labels(parent)).toEqual(['z', 'a', 'b']);
        expect(childList.size).toBe(3);
    });

    /**
     * REMOVAL RUNS THE CHILD'S OWN `unmount`, which is what makes a recycling node source work at
     * all. Asserted by overwriting `unmount` on the child — the same door the survival idiom uses —
     * so this pins the CALL and not a downstream effect of it.
     */
    it('runs the child unmount on removal, not a bare removeChild', () => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        EXO_BACKEND.render(
            SHELL((r, c) => {
                childList = r;
                conn = c;
            }),
            parent
        );

        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('a')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('b')));

        let unmounted = 0;
        const doomed = childList.at(0) as unknown as TExoDomChild;
        const wasUnmount = doomed.unmount;
        doomed.unmount = function (this: TExoDomChild): void {
            unmounted++;
            wasUnmount.call(this);
        };

        childList.remove(0);

        expect(unmounted).toBe(1);
        expect(labels(parent)).toEqual(['b', 'tail']);
        expect(childList.size).toBe(1);
        expect((childList.at(0) as unknown as TExoDomChild).node).toBe(
            parent.querySelectorAll('li')[0]
        );
    });

    /**
     * THE COMMANDS AND THE DIFF AGREE ON THE OUTPUT — the claim the whole design rests on, and the
     * only one a reader cannot check by inspection.
     *
     * Two shells are rendered. One is advanced by commands to the sequence a-b-c; the other is given
     * the same three rows through `bindChildren` and reconciled. The markup must be identical, byte
     * for byte, including the static sibling behind the child list.
     */
    it('lands the same markup a bound-and-reconciled child list does', () => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const written = host();
        EXO_BACKEND.render(
            SHELL((r, c) => {
                childList = r;
                conn = c;
            }),
            written
        );
        for (const t of ['a', 'b', 'c']) childList.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));

        const bound = host();
        const BOUND = createExoTestMachine(
            (b) => {
                let rows!: TExoChildrenPort;
                b.el('ul', null, (ul) => {
                    rows = ul.childrenPort();
                    ul.el('li', { class: 'tail' }, (li) => {
                        li.text('tail');
                    });
                });
                return { rows };
            },
            (
                    P
                ): TExoMachineInitialState<
                    TDriving & {
                        childList(port: TExoChildrenPort): TExoChildList;
                    }
                > =>
                (c) => {
                    const kids = ['a', 'b', 'c'].map((t) => c.build(ROW, ROW_LABELS.indexOf(t)));
                    reconcileExoOrder(c.childList(P.rows), [], kids, kids, (child) => child);
                }
        );
        EXO_BACKEND.render(BOUND, bound);

        expect(written.innerHTML).toBe(bound.innerHTML);
    });
});

describe('the placement pair — attach and detach, which tell the child nothing', () => {
    /** Renders the boundary shell and hands back everything the tests below drive it with. */
    const shell = (): { childList: TExoChildList; conn: TDriving; parent: HTMLElement } => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        EXO_BACKEND.render(
            SHELL((r, c) => {
                childList = r;
                conn = c;
            }),
            parent
        );
        return { childList, conn, parent };
    };

    /** The child's element, through the same one field every command in the child list reads. */
    const nodeOf = (child: TExoNode<TExoDomMark>): Element =>
        (child as unknown as TExoDomChild).node;

    it('hands the child back, takes its node out, and keeps `order` true', () => {
        const { childList, conn, parent } = shell();
        for (const t of ['a', 'b', 'c']) childList.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));

        const middle = childList.at(1);
        const taken = childList.detach(1);

        // THE SAME CHILD OBJECT COMES BACK, which is the whole reason this returns anything: the
        // caller has to be able to hold it.
        expect(taken).toBe(middle);
        expect(labels(parent)).toEqual(['a', 'c', 'tail']);
        expect(childList.size).toBe(2);
        // OUT OF THE DOCUMENT, not merely out of `order`.
        expect(nodeOf(taken as TExoNode<TExoDomMark>).parentNode).toBe(null);
        // AND THE TAIL STILL MIRRORS THE DOCUMENT, exactly as `remove` leaves it.
        for (let i = 0; i < childList.size; i++) {
            expect((childList.at(i) as unknown as TExoDomChild).node).toBe(
                parent.querySelectorAll('li')[i]
            );
        }
    });

    it('leaves a detached child subscribed, writing into a node that is out of the document', () => {
        const { childList, conn, parent } = shell();
        const source = cell('one');
        childList.insert(buildBound(conn, source));

        const child = childList.at(0) as TExoNode<TExoDomMark>;
        const element = nodeOf(child);
        expect(labels(parent)).toEqual(['one', 'tail']);

        const taken = childList.detach(0);
        expect(taken).toBe(child);
        expect(labels(parent)).toEqual(['tail']);

        // THE ASSERTION THIS WHOLE PAIR EXISTS FOR. `remove` would have run `unmount`, which ends
        // the child's disposers and unsubscribes it; after `detach` the binding is still there, so a
        // write lands in an element nobody can see. That is the trade the doc comment states, and it
        // is what makes showing the child again free.
        source.setValue('two');
        expect(element.textContent).toBe('two');

        // AND IT IS STILL CURRENT WHEN IT COMES BACK — no re-read, no re-wire, no rebuild.
        childList.attach(taken as TExoNode<TExoDomMark>, 0);
        expect(labels(parent)).toEqual(['two', 'tail']);
    });

    it('puts the very same element back, in front of the static sibling', () => {
        const { childList, conn, parent } = shell();
        for (const t of ['a', 'b', 'c']) childList.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));
        const child = childList.at(2) as TExoNode<TExoDomMark>;
        const element = nodeOf(child);

        const taken = childList.detach(2) as TExoNode<TExoDomMark>;
        expect(labels(parent)).toEqual(['a', 'b', 'tail']);

        childList.attach(taken, 0);

        // IDENTITY AND NOT EQUALITY: the same object, not a second `<li>` carrying the same text. A
        // pair that rebuilt would pass every markup check in this file and fail this line.
        expect(nodeOf(childList.at(0) as TExoNode<TExoDomMark>)).toBe(element);
        expect(childList.at(0)).toBe(child);
        expect(labels(parent)).toEqual(['c', 'a', 'b', 'tail']);
        expect(childList.size).toBe(3);
        for (let i = 0; i < childList.size; i++) {
            expect((childList.at(i) as unknown as TExoDomChild).node).toBe(
                parent.querySelectorAll('li')[i]
            );
        }
    });

    it('appends when `attach` is given no index, at the child list end and not the parent end', () => {
        const { childList, conn, parent } = shell();
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('a')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('b')));

        const taken = childList.detach(0) as TExoNode<TExoDomMark>;
        childList.attach(taken);

        expect(labels(parent)).toEqual(['b', 'a', 'tail']);
        expect(childList.size).toBe(2);
    });

    it('runs neither hook, where `remove` runs `unmount` on the same child', () => {
        const { childList, conn, parent } = shell();
        const child = conn.build(ROW, ROW_LABELS.indexOf('a'));
        const rec = child as unknown as TExoDomChild;

        let mounted = 0;
        let unmounted = 0;
        const wasUnmount = rec.unmount;
        rec.mount = function (this: TExoDomChild): void {
            mounted++;
        };
        rec.unmount = function (this: TExoDomChild): void {
            unmounted++;
            wasUnmount.call(this);
        };

        // `insert` IS THE LIFECYCLE PAIR and is expected to tell the child — counted here so the
        // zeroes below are a difference between the two pairs and not a hook that never worked.
        childList.insert(child);
        expect(mounted).toBe(1);
        expect(unmounted).toBe(0);

        childList.detach(0);
        childList.attach(child);
        childList.detach(0);
        childList.attach(child, 0);

        // NOTHING WAS TOLD. Two round trips through the document and the child's own hooks were not
        // reached once.
        expect(mounted).toBe(1);
        expect(unmounted).toBe(0);

        // AND THE OTHER PAIR STILL DOES. A child that was detached and put back is an ordinary
        // member of the child list again: `remove` runs its `unmount`, which is what ends its
        // subscriptions and — under a node source that takes elements back — offers its element to
        // the pile.
        childList.remove(0);
        expect(unmounted).toBe(1);
        expect(labels(parent)).toEqual(['tail']);
        expect(childList.size).toBe(0);
    });

    it('ends a detached-and-returned child’s subscriptions when it is finally removed', () => {
        const { childList, conn, parent } = shell();
        const source = cell('one');
        childList.insert(buildBound(conn, source));

        const taken = childList.detach(0) as TExoNode<TExoDomMark>;
        const element = nodeOf(taken);
        childList.attach(taken, 0);
        childList.remove(0);

        expect(labels(parent)).toEqual(['tail']);
        // THE DISPOSAL REALLY RAN, which `detach` skipped: the binding is gone, so this write lands
        // nowhere. Without it, "detach keeps subscriptions" could be true because the child list never
        // ends any.
        source.setValue('two');
        expect(element.textContent).toBe('one');
    });

    it('returns `undefined` and changes nothing past the end, and below the start', () => {
        const { childList, conn, parent } = shell();
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('a')));
        childList.insert(conn.build(ROW, ROW_LABELS.indexOf('b')));
        const before = parent.innerHTML;

        // `at`'s SHAPE AND NOT `remove`'s. `remove(5)` reads `undefined` out of `order` and throws
        // on the field access, which is the honest answer for a caller whose model has diverged;
        // `detach` HANDS SOMETHING BACK, so it can say "there was nobody there" instead.
        expect(childList.detach(2)).toBeUndefined();
        expect(childList.detach(99)).toBeUndefined();
        expect(childList.detach(-1)).toBeUndefined();

        expect(parent.innerHTML).toBe(before);
        expect(childList.size).toBe(2);
        for (let i = 0; i < childList.size; i++) {
            expect((childList.at(i) as unknown as TExoDomChild).node).toBe(
                parent.querySelectorAll('li')[i]
            );
        }
    });

    it('acquires an element for a child that has never been built, without mounting it', () => {
        const { childList, conn, parent } = shell();
        const child = conn.build(ROW, ROW_LABELS.indexOf('a'));
        const rec = child as unknown as TExoDomChild;
        let mounted = 0;
        rec.mount = function (this: TExoDomChild): void {
            mounted++;
        };

        // `c.build(...)` ACQUIRES ITS ELEMENT AND WIRES THE INSTANCE, which is the whole of
        // create-then-place: the child is finished and merely standing nowhere. `attach` puts it
        // in the document and runs NO `mount`, which is its only difference from `insert`.
        expect(rec.node).not.toBeUndefined();
        expect(rec.node.parentNode).toBe(null);

        childList.attach(child);

        expect(labels(parent)).toEqual(['a', 'tail']);
        expect(rec.node.parentNode).not.toBe(null);
        expect(mounted).toBe(0);
    });

    it('empties a child list from the end and refills it, leaving `order` and the markup right', () => {
        const { childList, conn, parent } = shell();
        const sources = ['a', 'b', 'c'].map((t) => cell(t));
        for (const s of sources) childList.insert(buildBound(conn, s));
        const elements = [0, 1, 2].map((i) => nodeOf(childList.at(i) as TExoNode<TExoDomMark>));

        // FROM THE END DOWNWARDS — the spelling that re-indexes nothing, which is what the child list's
        // header names as the caller's lever over what a hide costs.
        const held: TExoNode<TExoDomMark>[] = [];
        for (let i = childList.size - 1; i >= 0; i--)
            held[i] = childList.detach(i) as TExoNode<TExoDomMark>;

        expect(childList.size).toBe(0);
        expect(labels(parent)).toEqual(['tail']);
        expect(held).toHaveLength(3);

        // A WRITE WHILE EVERY ROW IS OUT — all three are still live, which is the state a kept block
        // spends its hidden phase in.
        for (let i = 0; i < sources.length; i++) sources[i].setValue(`${i}`);

        for (let i = 0; i < held.length; i++) childList.attach(held[i]);

        expect(labels(parent)).toEqual(['0', '1', '2', 'tail']);
        for (let i = 0; i < childList.size; i++) {
            expect((childList.at(i) as unknown as TExoDomChild).node).toBe(
                parent.querySelectorAll('li')[i]
            );
            expect(nodeOf(childList.at(i) as TExoNode<TExoDomMark>)).toBe(elements[i]);
        }
    });
});

/**
 * `detachAll` — THE PLACEMENT PAIR'S WHOLE-CHILD LIST FORM, AND THE ONE COMMAND HERE WITH TWO BODIES.
 *
 * WHAT IS BEING CLAIMED. Where the port is its element's ONE AND ONLY child the whole hide is a
 * single `parent.textContent = ''`; everywhere else it is a climb-and-remove per child, exactly as
 * `detach` performs one. The choice is the COMPILER's (`TExoDomSchema.ownsElement`, handed in by
 * `c.childList` as the same `ownsElement[port.index] === 1` every reconciler reads as `ownsParent`),
 * it is fixed when the schema is compiled, and A CALLER MUST NOT BE ABLE TO TELL WHICH BODY RAN
 * EXCEPT BY THE CLOCK.
 *
 * SO THE TESTS COME IN TWO KINDS AND BOTH ARE NECESSARY.
 *
 *  1. THE TWO PATHS AGREE. One record of everything a caller can observe is built from the same
 *     script on an owned shell and on a shared one, and the two must be equal — AND equal to a
 *     written-out expectation, so that a bug breaking both identically still fails.
 *  2. THE FAST PATH IS NOT TAKEN WHERE IT IS ILLEGAL. This is what an agreement test cannot catch:
 *     two shells that both wipe their parent agree with each other perfectly. The catches are the
 *     STATIC SIBLINGS on either side of a port, and a SECOND PORT standing behind the first — the
 *     two shapes `TExoChildList`'s header names, and the two `ownsElement` exists to separate from the
 *     common case. Either one surviving is the whole proof that the flag was read.
 */
describe('detachAll — every child out at once, and only sometimes in one call', () => {
    /** The child's element, through the same one field every command in the child list reads. */
    const nodeOf = (child: TExoNode<TExoDomMark>): Element =>
        (child as unknown as TExoDomChild).node;

    /**
     * Render a one-child list shell and hand back what drives it. `typeof SHELL` is the shape all three
     * one-port shells share — one `rows` port, one `TDriving` wire — so the same driver can run a
     * script against an owned child list and a shared one without either being written twice.
     */
    const drive = (
        make: typeof SHELL
    ): { childList: TExoChildList; conn: TDriving; parent: HTMLElement } => {
        let childList!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        EXO_BACKEND.render(
            make((r, c) => {
                childList = r;
                conn = c;
            }),
            parent
        );
        return { childList, conn, parent };
    };

    /**
     * EVERYTHING A CALLER CAN OBSERVE OF ONE `detachAll`, as one comparable value — the instrument
     * behind claim (1) above. Three rows go in, all three come out, and what is recorded is the
     * return, the child list and every child's own state. Nothing in here reads the parent, because the
     * two shells hold different static content on purpose and that is what test (2) is for.
     */
    const observe = (
        childList: TExoChildList,
        conn: TDriving
    ): {
        returnedTheSameChildren: boolean;
        keptTheSameElements: boolean;
        texts: readonly (string | null)[];
        parents: readonly (Node | null)[];
        size: number;
        at0: unknown;
    } => {
        const built = ['a', 'b', 'c'].map((t) => conn.build(ROW, ROW_LABELS.indexOf(t)));
        for (const child of built) childList.insert(child);
        const elements = built.map((child) => nodeOf(child));

        const taken = childList.detachAll();

        return {
            // THE ORDER IS PART OF THE CONTRACT: child list order, so a caller can put them back with a
            // forward loop and get the tree it had.
            returnedTheSameChildren:
                taken.length === built.length && taken.every((child, i) => child === built[i]),
            // NO REBUILD ANYWHERE — the elements are the ones the inserts put in the document, which
            // is the entire point of the placement pair.
            keptTheSameElements: taken.every((child, i) => nodeOf(child) === elements[i]),
            texts: taken.map((child) => nodeOf(child).textContent),
            parents: taken.map((child) => nodeOf(child).parentNode),
            size: childList.size,
            at0: childList.at(0),
        };
    };

    it('leaves identical observable state whether or not the child list owns its element', () => {
        const owned = drive(OPEN_SHELL);
        const shared = drive(SHELL);

        const fromOwned = observe(owned.childList, owned.conn);
        const fromShared = observe(shared.childList, shared.conn);

        // WRITTEN OUT, NOT ONLY COMPARED. Two paths that both forgot to reset `index` would agree
        // with each other and this line is what refuses that.
        expect(fromOwned).toEqual({
            returnedTheSameChildren: true,
            keptTheSameElements: true,
            texts: ['a', 'b', 'c'],
            // OUT OF THE DOCUMENT, not merely out of `order` — and out on BOTH paths, although only
            // one of them ever names a child in a `removeChild`.
            parents: [null, null, null],
            size: 0,
            at0: undefined,
        });
        // AND THE TWO ARE THE SAME. This is the claim the whole method is written to: the fast path
        // is an optimisation and not a second behaviour.
        expect(fromShared).toEqual(fromOwned);

        // The hosts differ, and only in what was never the child list's: the owned one is empty, the
        // shared one still has its static.
        expect(owned.parent.querySelector('ul')?.innerHTML).toBe('');
        expect(labels(shared.parent)).toEqual(['tail']);
    });

    it('leaves the static siblings on BOTH sides of the port standing', () => {
        const { childList, conn, parent } = drive(SANDWICH_SHELL);
        for (const t of ['a', 'b', 'c']) childList.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));
        expect(labels(parent)).toEqual(['head', 'a', 'b', 'c', 'tail']);

        const taken = childList.detachAll();

        // THE TEST THIS WHOLE FEATURE IS GATED ON. `parent.textContent = ''` here would take the
        // heading and the footer with the rows, and every other assertion in this file would still
        // pass. `ownsElement` is 0 for this port, so the per-child body has to run.
        expect(labels(parent)).toEqual(['head', 'tail']);
        expect(parent.querySelector('ul')?.childNodes).toHaveLength(2);
        expect(taken).toHaveLength(3);
        expect(childList.size).toBe(0);
        for (const child of taken) {
            expect(nodeOf(child).parentNode).toBe(null);
        }

        // AND THE BOUNDARY STILL HOLDS AFTERWARDS: a child put back lands between the two statics,
        // which is what proves `order` and the end anchor came through the bulk call intact.
        for (const child of taken) childList.attach(child);
        expect(labels(parent)).toEqual(['head', 'a', 'b', 'c', 'tail']);
    });

    it('leaves a second port’s child list behind it completely untouched', () => {
        let front!: TExoChildList;
        let back!: TExoChildList;
        let conn!: TDriving;
        const parent = host();
        EXO_BACKEND.render(
            TWO_PORT_SHELL((f, b, c) => {
                front = f;
                back = b;
                conn = c;
            }),
            parent
        );

        for (const t of ['a', 'b']) front.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));
        for (const t of ['x', 'y']) back.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));
        expect(labels(parent)).toEqual(['a', 'b', 'x', 'y']);
        const behind = [0, 1].map((i) => back.at(i) as TExoNode<TExoDomMark>);
        const behindElements = behind.map((child) => nodeOf(child));

        front.detachAll();

        // NEITHER PORT OWNS THIS `<ul>` — there are two of them in it — so the front child list may not
        // wipe the element. A one-call clear here would delete `x` and `y` from the document while
        // the BACK child list's `order` went on describing them, which is the state the child list header
        // calls reconciling against fiction.
        expect(labels(parent)).toEqual(['x', 'y']);
        expect(back.size).toBe(2);
        for (let i = 0; i < back.size; i++) {
            expect(back.at(i)).toBe(behind[i]);
            expect(nodeOf(back.at(i) as TExoNode<TExoDomMark>)).toBe(behindElements[i]);
            expect(behindElements[i].parentNode).not.toBe(null);
        }

        // AND THE FRONT CHILD LIST'S END ANCHOR SURVIVED THE BULK CALL: a child attached back into it
        // goes in FRONT of the back child list's first row, which is the chain being walked and not a
        // stale node being remembered.
        front.attach(conn.build(ROW, ROW_LABELS.indexOf('z')));
        expect(labels(parent)).toEqual(['z', 'x', 'y']);
    });

    it('leaves every detached child subscribed, on both paths', () => {
        for (const shell of [OPEN_SHELL, SHELL] as const) {
            const { childList, conn, parent } = drive(shell);
            const sources = ['one', 'two', 'three'].map((t) => cell(t));
            for (const s of sources) childList.insert(buildBound(conn, s));
            const elements = [0, 1, 2].map((i) => nodeOf(childList.at(i) as TExoNode<TExoDomMark>));

            const taken = childList.detachAll();

            // NOTHING WAS DISPOSED. `detachAll` runs no `unmount` — not the child's, not the
            // schema's — so every binding is still live and a write lands in an element nobody can
            // see. That is what makes showing the block again free, the trade the doc states.
            for (let i = 0; i < sources.length; i++) sources[i].setValue(`${i}`);
            for (let i = 0; i < elements.length; i++) {
                expect(elements[i].textContent).toBe(`${i}`);
                expect(elements[i].parentNode).toBe(null);
            }

            // AND THE TEXT IS ALREADY CURRENT WHEN THEY COME BACK — no re-read, no re-wire, no
            // rebuild, and the SAME element objects in the SAME order.
            for (const child of taken) childList.attach(child);
            for (let i = 0; i < elements.length; i++) {
                expect(nodeOf(childList.at(i) as TExoNode<TExoDomMark>)).toBe(elements[i]);
            }
            expect(labels(parent).slice(0, 3)).toEqual(['0', '1', '2']);
        }
    });

    it('runs no hook of any kind, on either path', () => {
        for (const shell of [OPEN_SHELL, SHELL] as const) {
            const { childList, conn } = drive(shell);
            let mounted = 0;
            let unmounted = 0;
            const built = ['a', 'b', 'c'].map((t) => {
                const child = conn.build(ROW, ROW_LABELS.indexOf(t));
                const rec = child as unknown as TExoDomChild;
                const wasUnmount = rec.unmount;
                rec.mount = function (this: TExoDomChild): void {
                    mounted++;
                };
                rec.unmount = function (this: TExoDomChild): void {
                    unmounted++;
                    wasUnmount.call(this);
                };
                return child;
            });

            // `insert` IS THE LIFECYCLE PAIR and tells the child — counted so the zero below is a
            // difference between the two pairs rather than a hook that never worked.
            for (const child of built) childList.insert(child);
            expect(mounted).toBe(3);

            childList.detachAll();
            for (const child of built) childList.attach(child);
            childList.detachAll();

            // TWO WHOLE-CHILD LIST ROUND TRIPS AND NOT ONE `unmount`. Under a recycling node source this
            // is also the statement that no element went back to a pile, since the release lives
            // inside the `unmount` the schema installed.
            expect(unmounted).toBe(0);
            expect(mounted).toBe(3);
        }
    });

    it('is a no-op on an empty child list, down to touching the document at all', () => {
        const { childList, parent } = drive(OPEN_SHELL);
        const ul = parent.querySelector('ul') as HTMLElement;
        // A NODE THE CHILD LIST DOES NOT HOLD, standing in an element the port DOES own. With children
        // present the one-call clear would take it — that is `clearOwnedExoChildList`'s stated difference
        // and the better answer for an owned element. With NO children there is nothing to clear,
        // and this asserts the early return really is early: a hide handler that does not know
        // whether the block is already hidden may call this without writing to the document.
        const stray = document.createElement('i');
        ul.appendChild(stray);
        const before = ul.innerHTML;

        const taken = childList.detachAll();

        expect(taken).toEqual([]);
        expect(childList.size).toBe(0);
        expect(ul.innerHTML).toBe(before);
        expect(stray.parentNode).toBe(ul);
    });

    it('hands back an array of the caller’s own, not the child list’s live order', () => {
        const { childList, conn } = drive(OPEN_SHELL);
        for (const t of ['a', 'b', 'c']) childList.insert(conn.build(ROW, ROW_LABELS.indexOf(t)));

        const taken = childList.detachAll();
        // `order`'s IDENTITY IS PUBLISHED to the child list in front of this one, so it is emptied in
        // place and never handed out. Putting the children back refills that same array; if this
        // return were it, the caller's hold on its hidden block would refill under it and this
        // length would be wrong.
        for (const child of taken) childList.attach(child);

        expect(taken).toHaveLength(3);
        expect(childList.size).toBe(3);
    });
});
