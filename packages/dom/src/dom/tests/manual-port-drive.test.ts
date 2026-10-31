// @vitest-environment jsdom
//
// DRIVING A PORT BY HAND — `c.fillDoors()` and `c.onTeardown(disposer)`, which are `bind` taken apart.
//
// WHY THEY EXIST. `bind` is three things fused: write the value now, subscribe, and put the
// unsubscribe into this instance's teardown. The middle one names a shape — a
// `getValue()`/`onChange()` pair — and a reactive system that is not shaped like that has to build
// an adapter object per binding to be allowed in. These two calls are the other two thirds without
// the middle one, so a store whose value is reached as a property and whose change arrives on a
// flush drives a port directly and this package names no shape for it.
//
// WHAT `c.fillDoors()` REPLACED, because these tests were written against the older shapes. There were
// three: `c.setter(port)`, which handed back a closure PER WRITTEN PORT; `c.writerFor(port)` /
// `c.targetFor(port)`, the same fill in two allocation-free halves, both typed `unknown` so that
// crossing one port's target with another port's writer was spellable and uncatchable; and, on
// `@exodra/string`, a whole extra schema table folding each port's index into its escaping writer
// so that a two-piece fill would fit a one-target signature. All three existed because the
// exonode's node table was SCRATCH — pooled per (schema, depth) and overwritten by every replay —
// so a slot number meant nothing once the wire returned. The table belongs to the instance now, and
// one value carries the lot.
//
// WHAT EACH TEST HERE IS PROTECTING, because none of it is visible from the outside:
//
//  1. THE PORTS VALUE OUTLIVES THE WIRE, AND STAYS THIS INSTANCE'S. The two-instance test below is
//     the one that catches a value that resolved its element late: it drives instance ONE after
//     instance TWO has been wired through the same schema.
//  2. A LATE WRITE LANDS AT ALL.
//  3. A FILL MADE DURING THE WIRE IS RECORDED, so the sweep that restores skipped ports does not
//     take it back out again. That is the assertion `setter`'s hand-out stamp never got — its own
//     header in this file used to say the stamp was UNCOVERED — and the three-attribute template at
//     the bottom is what covers it now.
//  4. `onTeardown` REACHES THE SAME LIST `bind` DOES. A caller's subscription has to die with the element
//     it writes into, or the page keeps dispatching into a detached tree.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoFillDoors,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

/** What these wires assume about the exonode they are handed, and nothing more. */
type TDriving = {
    fillDoors(): TExoFillDoors;
    onTeardown(off: () => void): void;
};

/** One element, one attribute port — shared so two wires can be compared over the same schema. */
function buildClassBox(b: TExoSchemaCursor) {
    let cls!: TExoAttrPort;
    b.el('div', null, (d) => {
        cls = d.port('class');
    });
    return { cls };
}

describe('driving a port by hand', () => {
    it('writes through the handed-out ports value, now and again later', () => {
        let drive!: TExoFillDoors;
        let cls!: TExoAttrPort;
        const COMP = createExoTestMachine(
            buildClassBox,
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    const p = c.fillDoors();
                    p.attr(P.cls, 'first');
                    drive = p;
                    cls = P.cls;
                }
        );

        const parent = host();
        EXO_BACKEND.render(COMP, parent);
        const el = parent.firstElementChild as Element;

        expect(el.getAttribute('class')).toBe('first');
        drive.attr(cls, 'second');
        expect(el.getAttribute('class')).toBe('second');
    });

    /**
     * THE ONE THAT CATCHES A LAZY TABLE. Two instances of one component are wired one after the
     * other — two rows of one list — and then the FIRST instance's ports value is used.
     *
     * A value that resolved its element at call time, by replaying the walk against whatever the
     * schema currently describes, would write into instance two; the assertion that catches it is
     * the one on the SECOND element being untouched. Without that second assertion the test passes
     * on a broken implementation, because instance one's element would also happen to be right in
     * a single-instance render.
     *
     * IT ALSO ASSERTS THE TWO VALUES ARE NOT THE SAME OBJECT: two instances, two tables.
     */
    it('keeps each instance its own ports value, after another instance has been wired', () => {
        const drivers: TExoFillDoors[] = [];
        let cls!: TExoAttrPort;
        const COMP = createExoTestMachine(
            buildClassBox,
            (P): TExoMachineInitialState<TDriving> =>
                (c, i) => {
                    const p = c.fillDoors();
                    p.attr(P.cls, `row-${i}`);
                    drivers.push(p);
                    cls = P.cls;
                }
        );
        const LIST = createExoTestMachine(
            (b) => {
                let rows!: TExoChildrenPort;
                b.el('section', null, (s) => {
                    rows = s.childrenPort();
                });
                return { rows };
            },
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    c.list(P.rows, COMP, 2);
                }
        );

        const parent = host();
        EXO_BACKEND.render(LIST, parent);
        const [one, two] = Array.from(parent.querySelectorAll('div'));

        expect(one.getAttribute('class')).toBe('row-0');
        expect(two.getAttribute('class')).toBe('row-1');
        // TWO INSTANCES, TWO TABLES — the property that makes the rest of this test possible,
        // asserted rather than assumed.
        expect(drivers[0]).not.toBe(drivers[1]);

        drivers[0].attr(cls, 'written');

        expect(one.getAttribute('class')).toBe('written');
        // THE HALF THAT DISCRIMINATES: instance two must not have moved.
        expect(two.getAttribute('class')).toBe('row-1');
    });

    /** Two calls in one wire are two names for one table, not two tables. */
    it('hands the same value back to a wire that asks twice', () => {
        const seen: TExoFillDoors[] = [];
        const COMP = createExoTestMachine(
            buildClassBox,
            (): TExoMachineInitialState<TDriving> => (c) => {
                seen.push(c.fillDoors(), c.fillDoors());
            }
        );

        EXO_BACKEND.render(COMP, host());

        expect(seen[0]).toBe(seen[1]);
    });

    it('lands a value written after the wire has returned', () => {
        let drive!: TExoFillDoors;
        let cls!: TExoAttrPort;
        const COMP = createExoTestMachine(
            buildClassBox,
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    drive = c.fillDoors();
                    cls = P.cls;
                }
        );

        const parent = host();
        EXO_BACKEND.render(COMP, parent);
        const el = parent.firstElementChild as Element;

        drive.attr(cls, 'late');
        expect(el.getAttribute('class')).toBe('late');
    });

    /**
     * `onTeardown` PUTS THE CALLER'S DISPOSER WHERE `bind` PUTS ITS OWN. Asserted through the render's
     * disposer rather than through a child's, because that is the path a top-level
     * `ExoDomBackend.render` takes and the one with no `TExoDomChild` to hang it on.
     */
    it('ends a caller-owned subscription with the render', () => {
        let ended = 0;
        const COMP = createExoTestMachine(
            (b) => {
                b.el('div', null, () => undefined);
                return {};
            },
            (): TExoMachineInitialState<TDriving> => (c) => {
                c.onTeardown(() => {
                    ended++;
                });
            }
        );

        const parent = host();
        // `render` RETURNS THE DISPOSER for everything this render subscribed to — there is no
        // handle object, and this is the same call every application makes.
        const dispose = EXO_BACKEND.render(COMP, parent);

        expect(ended).toBe(0);
        dispose();
        expect(ended).toBe(1);
    });

    /**
     * THE FILL RECORD, SEEN THROUGH THE SWEEP IT EXISTS FOR.
     *
     * Three attribute ports on ONE element. The compiler keeps a placeholder for every port that
     * another attribute port FOLLOWS (`followed[i] === 1`), because two ports on one element must
     * come out in declaration order — so `data-a` and `data-b` keep theirs and `data-c`, being
     * last, has its removed at compile time. `restore` for a kept one is `removeAttributeNS`.
     *
     * The wire fills `data-a` through the ports value and leaves the other two alone, so the sweep
     * runs (`writes !== setters.length`) and finds `data-b` unfilled. What each assertion says:
     *
     *  - `data-a` still holds its value → `set` recorded the fill. Delete the
     *    `this.written[this.writes++]` store from it and this line fails, because the sweep
     *    would remove the attribute the wire had just written.
     *  - `data-b` is gone → the sweep genuinely ran on this template and does remove kept
     *    placeholders, which is what makes the line above mean something.
     *  - `data-c` is gone for a different reason — no placeholder was ever kept for it — and is
     *    asserted so that a future change moving that boundary is visible here.
     *
     * THIS IS THE ASSERTION `setter`'s HAND-OUT STAMP NEVER HAD. Its header in this file used to
     * record that the stamp had been deleted with every test still green, because a lone `class`
     * port keeps no placeholder and the sweep has nothing to undo. Three attribute ports on one
     * element is the template that does keep them.
     */
    it('is not swept back over, because the fill is recorded', () => {
        const CARD = createExoTestMachine(
            (b) => {
                let first!: TExoAttrPort;
                let second!: TExoAttrPort;
                let third!: TExoAttrPort;
                b.el('div', null, (d) => {
                    first = d.port('data-a');
                    second = d.port('data-b');
                    third = d.port('data-c');
                });
                return { first, second, third };
            },
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    c.fillDoors().attr(P.first, 'written');
                }
        );

        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const el = parent.firstElementChild as Element;

        expect(el.getAttribute('data-a')).toBe('written');
        expect(el.hasAttribute('data-b')).toBe(false);
        expect(el.hasAttribute('data-c')).toBe(false);
    });
});
