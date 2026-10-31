// @vitest-environment jsdom
//
// WHAT THE HYDRATION WALK PROMISES THE NODE TABLE, which decides how that table is allocated.
//
// `hydrateExoInstance` starts from `[root]` and lets the walk APPEND, the same single-element
// start `createExoMachineNode` uses on the building path. That is only safe while the walk writes
// slot 1, then 2, then 3 — an out-of-order write past `length` would leave a hole, and a holey
// array costs every later read. The hydration walk is the one with reason to differ: it carries a
// third op, a landing counted BACK from a parent's last child, emitted for a port that sits behind
// a child list. This file pins that the extra op changes which node is FOUND and never the order
// slots are FILLED in.
//
// The battery covers each way a schema can shape the walk: a flat row of ports, a deep chain, the
// back-counting op in three arrangements, ports that are attributes and events rather than text,
// and a child list buried inside a branch. For each one the walk must write 1..slots-1, in
// ascending order, leaving nothing unwritten — if a slot were skipped, `[root]` would hand a
// setter `undefined` where the old pre-fill handed it the root element.
//
// A TEXT REPAIR IS NOT A SECOND FILL: `textLandings` exists because an empty text port prints
// nothing, so the server's element arrives with no child to land on. Every slot it repairs is a
// slot the walk already wrote, which is what the last assertion states.
import { describe, expect, it } from 'vitest';
import { createExoSchema } from '@exodra/core';
import type { TExoSchemaCursor, TExoCursorDeclaration } from '@exodra/core';
import { compileExoDomSchema } from '../../dom/compileExoDomSchema';
import { compileExoHydrateSchema } from '../compileExoHydrateSchema';
import { ExoDomBackend } from '../../dom/ExoDomBackend';
import { withExoHydration } from '../withExoHydration';

const EXO_HYDRATING = withExoHydration(new ExoDomBackend());

// SPELLED OUT, not `Parameters<typeof createExoSchema>[0]`: that reads the FIRST of three
// overloads through an uninstantiated generic, so the cursor resolves to nothing and every
// builder callback below is an implicit `any` — which `typecheck:tests` catches and the suite,
// running on transpiled output, does not.
type TBuild = (cursor: TExoSchemaCursor) => Record<string, unknown>;

const walkOf = (build: TBuild): { written: number[]; repaired: number[]; slots: number } => {
    const declaration = createExoSchema(build) as TExoCursorDeclaration;
    const dom = compileExoDomSchema(declaration, EXO_HYDRATING);
    const hydrate = compileExoHydrateSchema(declaration, EXO_HYDRATING, dom);
    const written: number[] = [];
    for (let i = 0; i < hydrate.walk.length; i += 3) written.push(hydrate.walk[i]);
    const repaired: number[] = [];
    const landings = hydrate.textLandings;
    if (landings !== null) for (let i = 0; i < landings.length; i += 2) repaired.push(landings[i]);
    return { written, repaired, slots: hydrate.slots };
};

const SHAPES: Array<[string, TBuild]> = [
    [
        'a flat row of text ports',
        (b) => {
            const p: Record<string, unknown> = {};
            b.el('div', null, (d) => {
                d.el('span', null, (s) => (p.a = s.textPort()));
                d.el('span', null, (s) => (p.b = s.textPort()));
                d.el('span', null, (s) => (p.c = s.textPort()));
            });
            return p;
        },
    ],
    [
        'a deep chain of single children',
        (b) => {
            const p: Record<string, unknown> = {};
            b.el('div', null, (x1) =>
                x1.el('section', null, (x2) =>
                    x2.el('article', null, (x3) =>
                        x3.el('span', null, (x4) => (p.deep = x4.textPort()))
                    )
                )
            );
            return p;
        },
    ],
    [
        'a child list with a static tail behind it',
        (b) => {
            const p: Record<string, unknown> = {};
            b.el('ul', null, (ul) => {
                p.rows = ul.childrenPort();
                ul.el('li', null, (li) => (p.tail = li.textPort()));
            });
            return p;
        },
    ],
    [
        'a static head, a child list and two static tails',
        (b) => {
            const p: Record<string, unknown> = {};
            b.el('ul', null, (ul) => {
                ul.el('li', { class: 'head' }, (li) => li.text('h'));
                p.rows = ul.childrenPort();
                ul.el('li', { class: 't1' }, (li) => (p.t1 = li.textPort()));
                ul.el('li', { class: 't2' }, (li) => (p.t2 = li.textPort()));
            });
            return p;
        },
    ],
    [
        'two child lists side by side, each with a tail',
        (b) => {
            const p: Record<string, unknown> = {};
            b.el('div', null, (d) => {
                d.el('ul', null, (ul) => {
                    p.rowsA = ul.childrenPort();
                    ul.el('li', null, (li) => (p.tailA = li.textPort()));
                });
                d.el('ol', null, (ol) => {
                    p.rowsB = ol.childrenPort();
                    ol.el('li', null, (li) => (p.tailB = li.textPort()));
                });
            });
            return p;
        },
    ],
    [
        'attribute and event ports mixed with text',
        (b) => {
            const p: Record<string, unknown> = {};
            b.el('form', null, (f) => {
                f.el('input', { type: 'text' }, (i) => {
                    p.value = i.attrPort('value');
                    p.input = i.eventPort('input');
                });
                f.el('button', null, (btn) => {
                    p.click = btn.eventPort('click');
                    p.label = btn.textPort();
                });
            });
            return p;
        },
    ],
    [
        'a child list buried inside a branch with siblings after it',
        (b) => {
            const p: Record<string, unknown> = {};
            b.el('section', null, (s) => {
                s.el('header', null, (h) => (p.title = h.textPort()));
                s.el('div', null, (d) => {
                    d.el('ul', null, (ul) => {
                        p.rows = ul.childrenPort();
                        ul.el('li', null, (li) => (p.tail = li.textPort()));
                    });
                    d.el('span', null, (sp) => (p.after = sp.textPort()));
                });
                s.el('footer', null, (f) => (p.total = f.textPort()));
            });
            return p;
        },
    ],
];

describe('the hydration walk fills the node table in slot order', () => {
    for (const [name, build] of SHAPES) {
        it('writes 1..slots-1 ascending, with nothing skipped, for ' + name, () => {
            const { written, slots } = walkOf(build);
            const expected: number[] = [];
            for (let slot = 1; slot < slots; slot++) expected.push(slot);
            expect(written).toEqual(expected);
        });
    }

    it('repairs only text slots the walk already wrote', () => {
        for (const [, build] of SHAPES) {
            const { written, repaired } = walkOf(build);
            for (const slot of repaired) expect(written).toContain(slot);
        }
    });

    it('emits the back-counting op for a port behind a child list, and still fills in order', () => {
        const declaration = createExoSchema((b) => {
            const p: Record<string, unknown> = {};
            b.el('ul', null, (ul) => {
                p.rows = ul.childrenPort();
                ul.el('li', null, (li) => (p.tail = li.textPort()));
            });
            return p;
        }) as TExoCursorDeclaration;
        const dom = compileExoDomSchema(declaration, EXO_HYDRATING);
        const hydrate = compileExoHydrateSchema(declaration, EXO_HYDRATING, dom);
        const ops: number[] = [];
        for (let i = 0; i < hydrate.walk.length; i += 3) ops.push(hydrate.walk[i + 2]);
        expect(Math.max(...ops)).toBeGreaterThanOrEqual(2);
        const buildOps: number[] = [];
        for (let i = 0; i < dom.walk.length; i += 3) buildOps.push(dom.walk[i + 2]);
        expect(Math.max(...buildOps)).toBeLessThan(2);
    });
});
