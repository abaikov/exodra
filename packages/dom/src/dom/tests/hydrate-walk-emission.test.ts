// @vitest-environment jsdom
//
// THE HYDRATION TABLES ARE STILL EMITTED — the half of `compileExoDomSchema` that a client-only page
// never executes, pinned as OUTPUT rather than as behaviour.
//
// `hydrateWalk` and `hydrateUnreachable` are built inside the same emit pass as `walk`, interleaved with
// it line by line, and that interleaving is the design: the two walks share one slot allocator, so
// `elem`, `childListStartSlot` and `childListEndSlot` mean the same thing to both and cannot drift.
//
// WHAT THAT COSTS A CLIENT-ONLY PAGE, so that the next reader does not have to re-derive it.
// Counted with comments and blank lines removed, the hydration-only half of
// `compileExoDomSchema.ts` is 2 877 of the module's 14 320 executable source bytes — 20.1%. (The
// MINIFIED and GZIPPED figures are not stated because they were not measured; source bytes are not
// a proxy for either.) A page that never hydrates also retains three `Int32Array(portCount)` per
// schema WITH A CHILDREN PORT — `adoptStopSlot`, `childListPrevPort`, `childListPrevStatics`; a schema
// with none shares one empty table for all six — plus a fourth `hydrateWalk` for the rare
// schema with a static behind a child list. Nothing here is per instance, per row, per update or per
// event: it is once per (schema, backend) for the life of the process.
//
// AND THE FOUR SHAPES THAT COULD COLLECT IT, priced, because "it is impossible" is not true and
// saying so would only get it re-proposed:
//
//   A FLAG ON THE COMPILE CALL saves NOTHING. A bundler cannot fold a branch chosen by a
//   parameter, so every byte of the emission stays in the module — and it adds a hazard: the
//   schema is cached on `machine.forms`, so a client render that compiled without
//   the tables would hand a later `backend.hydrate(...)` a cached schema whose tables are empty.
//
//   COMPUTING THEM LAZILY is refused twice over. A getter, or a field written on second access, is
//   a second shape for an object every render reads `setters` and `elem` off — the rule the last
//   case in this file states. And a lazy body that lived in `hydrate/` would be an import from
//   `dom/` into `hydrate/`, which `hydrate/hydration-is-a-leaf.test.ts` and the
//   `hydration-is-a-leaf` rule in `.dependency-cruiser.cjs` both refuse by name.
//
//   A SECOND EMITTER THAT ONLY `hydrate/` IMPORTS is the one shape that does collect the bytes,
//   and its price is exactly the property the interleaving bought: a second slot allocator, which
//   is right only for as long as it agrees with `visit`'s, with nothing structural saying so —
//   the same two-walks-in-step failure `core/exo-schema`'s `numberPorts` note describes. Its cost
//   is one extra recursive walk of the schema per schema on a hydrating page, and it would take
//   six fields off `TExoDomSchema` (which the shape rule welcomes: fewer fields, still one literal).
//   It is not taken here.
//
//   LEAVING IT ALONE is what stands, and the reason is the middle paragraph rather than the bytes.
//
// SO THE PRESSURE TO MAKE THEM CONDITIONAL WILL COME BACK, and when it does the failure it produces
// is silent: a schema whose `hydrateWalk` is empty or absent hydrates a page by wiring its statics
// onto its own list rows, and the markup looks right the whole time. Every case below is here to
// make that a red test — the last describe in particular, which pins the whole output of the one
// shape that exercises every branch of the emission, so that a second emitter has a specification
// to be measured against rather than a diff to be eyeballed.
//
// WHAT IT DOES NOT CLAIM TO COVER. `compileExoDomSchema` now runs its hydration-walk REPLAY behind
// `typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'`, and no test in this
// suite observes the stripped side of that: `NODE_ENV` is `test` under vitest, so the replay is
// live here exactly as it was before. The two things that ARE checkable are checked — the spelling
// of the guard, by `core/src/browser-global-safety.test.ts`, which scans every source file in this
// package; and the tables the replay verifies, by this file, so that a build without the replay is
// still a build whose schema carries the walk.
import type { TExoSchemaCursor, TExoPort, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { EXO_ADOPT_STOP_UNKNOWN } from '../constants/EXO_ADOPT_STOP_UNKNOWN';
import { EXO_WALK_FROM_END } from '../constants/EXO_WALK_FROM_END';
import { exoDomSchemaOf } from '../exoDomSchemaOf';
import { ExoDomBackend } from '@exodra/dom';
import type { TExoDomSchema } from '../types/TExoDomSchema';
import { createExoTestMachine } from '@exodra/test-utils';

/**
 * ONE BACKEND FOR THE WHOLE FILE, at module level — a schema is cached per (declaration, backend)
 * and the key is compared by POINTER, so a backend built per call would compile a schema per call
 * and the chain assertions elsewhere in the suite would be measuring this file's habits.
 */
const EXO_BACKEND = new ExoDomBackend();

/** A component with nothing to fill — these cases are about the schema, not the wiring. */
const inert = (build: (b: TExoSchemaCursor) => void) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            build(b);
            return {};
        },
        (): TExoMachineInitialState<unknown> => () => undefined
    );

const schemaOf = (build: (b: TExoSchemaCursor) => void): TExoDomSchema =>
    exoDomSchemaOf(inert(build), EXO_BACKEND);

/** Ports, no child list: nothing stands behind a children port, so the two walks are one walk. */
const NO_CHILD_LIST = (b: TExoSchemaCursor) => {
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.textPort());
        card.el('footer', null, (f) => f.textPort());
    });
};

/** A static BEHIND a child list, with nothing behind it: the landing hydration counts from the end. */
const STATIC_BEHIND_CHILD_LIST = (b: TExoSchemaCursor) => {
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.textPort());
        card.childrenPort();
        card.el('footer', null, (f) => f.textPort());
    });
};

/** `<h3/>{a}<hr/>{b}<footer/>` — the one shape where a static is reachable from NEITHER end. */
const STATIC_BETWEEN_CHILD_LISTS = (b: TExoSchemaCursor) => {
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.textPort());
        card.childrenPort();
        card.el('hr');
        card.childrenPort();
        card.el('footer', null, (f) => f.textPort());
    });
};

/**
 * THE SAME SHAPE WITH ITS PORTS HANDED BACK. `STATIC_BETWEEN_CHILD_LISTS` above is deliberately inert,
 * because those cases are about the schema's own tables; the last describe reads the tables BY PORT
 * INDEX and so needs the ports.
 */
function buildBetween(b: TExoSchemaCursor): { a: TExoPort; b: TExoPort } {
    let a!: TExoPort;
    let second!: TExoPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.textPort());
        a = card.childrenPort();
        card.el('hr');
        second = card.childrenPort();
        card.el('footer', null, (f) => f.textPort());
    });
    return { a, b: second };
}

const portedPlan = <TPorts>(
    build: (b: TExoSchemaCursor) => TPorts
): { schema: TExoDomSchema; ports: TPorts } => {
    const component = createExoTestMachine(
        build,
        (): TExoMachineInitialState<unknown> => () => undefined
    );
    return {
        schema: exoDomSchemaOf(component, EXO_BACKEND),
        ports: component.declaration.ports,
    };
};

/**
 * The op of the hydration walk's landing on a given prototype node, or `null` when the walk never
 * lands there. Found through `protoLandings`, which is indexed by the same slot numbers both walks
 * allocate — so this asks about the NODE and never about a slot number, and a future change to how
 * slots are handed out cannot make these cases pass or fail for the wrong reason.
 */
function hydrateOpFor(schema: TExoDomSchema, node: Node): number | null {
    for (let i = 0; i < schema.hydrateWalk.length; i += 3) {
        if (schema.protoLandings[schema.hydrateWalk[i]] === node) return schema.hydrateWalk[i + 2];
    }
    return null;
}

describe('the hydration tables `compileExoDomSchema` emits', () => {
    it('shares ONE table with the render walk when no static stands behind a child list', () => {
        const schema = schemaOf(NO_CHILD_LIST);
        expect(schema.walk.length).toBeGreaterThan(0);
        // Identity, not equality: the point of `anyFromEnd` is that the common schema pays no
        // second copy of the same numbers. `toEqual` would pass on a duplicate.
        expect(schema.hydrateWalk).toBe(schema.walk);
    });

    it('emits a SEPARATE table counting back from the parent when one does', () => {
        const schema = schemaOf(STATIC_BEHIND_CHILD_LIST);
        expect(schema.hydrateWalk).not.toBe(schema.walk);

        // The `<footer>` is the last child position its parent has, so hydration reaches it as
        // `lastChild` with no hops — `EXO_WALK_FROM_END + 0` — however many rows the child list holds.
        const ops: number[] = [];
        for (let i = 2; i < schema.hydrateWalk.length; i += 3) ops.push(schema.hydrateWalk[i]);
        expect(ops).toContain(EXO_WALK_FROM_END);

        // And the render walk still reaches it forward, over a clone where the child list is empty.
        const renderOps: number[] = [];
        for (let i = 2; i < schema.walk.length; i += 3) {
            renderOps.push(schema.walk[i]);
        }
        expect(renderOps.every((op) => op < EXO_WALK_FROM_END)).toBe(true);
    });

    it('records the slots hydration cannot resolve, and shares ONE empty table when there are none', () => {
        const unreachable = schemaOf(STATIC_BETWEEN_CHILD_LISTS);
        // `[start, end)` — the `<hr>`'s slot and everything under it, which is what
        // `assertReachableExoPorts` reads to name a port instead of wiring it onto somebody's row.
        expect(unreachable.hydrateUnreachable.length).toBeGreaterThan(0);
        expect(unreachable.hydrateUnreachable.length % 2).toBe(0);

        const a = schemaOf(NO_CHILD_LIST);
        const b = schemaOf(STATIC_BEHIND_CHILD_LIST);
        expect(a.hydrateUnreachable.length).toBe(0);
        expect(b.hydrateUnreachable.length).toBe(0);
        // One shared zero-length array rather than an allocation per schema for a table nothing
        // will read — the claim `compileExoDomSchema` makes at the field.
        expect(a.hydrateUnreachable).toBe(b.hydrateUnreachable);
    });

    it('carries ONE empty table for all six child-list fields when no children port exists', () => {
        const none = schemaOf(NO_CHILD_LIST);
        // Every one of the six is indexed by a CHILDREN port's number, and this schema has none.
        expect(none.childListEndSlot.length).toBe(0);
        expect(none.childListStartSlot).toBe(none.childListEndSlot);
        expect(none.adoptStopSlot).toBe(none.childListEndSlot);
        expect(none.childListNextPort).toBe(none.childListEndSlot);
        expect(none.childListPrevPort).toBe(none.childListEndSlot);
        expect(none.childListPrevStatics).toBe(none.childListEndSlot);

        const some = schemaOf(STATIC_BEHIND_CHILD_LIST);
        expect(some.childListEndSlot.length).toBe(some.setters.length);
        expect(some.adoptStopSlot.length).toBe(some.setters.length);
        expect(some.childListStartSlot).not.toBe(some.childListEndSlot);
    });

    it('gives every schema the SAME fields in the SAME order, hydration tables included', () => {
        // THE REASON A FLAG ON THE COMPILE CALL IS NOT A FREE OPTION. `TExoDomSchema` is read on the
        // hot path of every render, and the schema literal is built whole so that every schema in
        // the process shares one hidden class. A field written only for some schemas — or written
        // afterwards, or behind a getter — is a second shape for the object every fill loads
        // `setters` and `elem` off. This is that property, stated as a test.
        const keys = Object.keys(schemaOf(NO_CHILD_LIST));
        expect(Object.keys(schemaOf(STATIC_BEHIND_CHILD_LIST))).toEqual(keys);
        expect(Object.keys(schemaOf(STATIC_BETWEEN_CHILD_LISTS))).toEqual(keys);
        expect(keys).toContain('hydrateWalk');
        expect(keys).toContain('hydrateUnreachable');
    });
});

/**
 * `<h3/>{a}<hr/>{b}<footer/>` — EVERY BRANCH OF THE EMISSION IN ONE SCHEMA, asserted against the
 * NODES rather than against slot numbers.
 *
 * It is the only shape that reaches all of them at once: the `<h3>` is resolved forward, the
 * `<footer>` is counted back from the parent's last child, the `<hr>` is reachable from NEITHER end
 * and is recorded as unreachable, child list `a` loses its boundary and child list `b` keeps one, and `b`'s
 * beginning is recovered by publication instead of by the walk. Four tables and two flags, and
 * every one of them is decided on a different line of `visit`.
 *
 * WHY IT IS PINNED AS OUTPUT AND NOT AS BEHAVIOUR. The behaviour is already covered, sharply, in
 * `anchored-children.test.ts` ('ports on the statics AROUND a child list, hydrated') and across the four
 * adopt paths in `hydrate/` — those are what say hydration still lands where it should. What is NOT
 * covered anywhere else is the TABLES themselves, and they are what a second emitter would have to
 * reproduce byte for byte. The header above prices that option; this is the specification it would
 * be measured against.
 *
 * EVERY ASSERTION GOES THROUGH `protoLandings`, so nothing here depends on which number a slot got.
 */
describe('the whole hydration output for `<h3/>{a}<hr/>{b}<footer/>`', () => {
    const setup = () => {
        const { schema, ports } = portedPlan(buildBetween);
        return {
            schema,
            a: ports.a.index,
            b: ports.b.index,
            h3: schema.proto.querySelector('h3') as Element,
            hr: schema.proto.querySelector('hr') as Element,
            footer: schema.proto.querySelector('footer') as Element,
        };
    };

    it('reaches the <footer> from the END of the parent and the <h3> forward', () => {
        const { schema, h3, footer } = setup();
        // The `<footer>` is its parent's LAST child position, so it is `lastChild` with no hops
        // back — `EXO_WALK_FROM_END + 0` — however many rows either child list turns out to hold.
        expect(hydrateOpFor(schema, footer)).toBe(EXO_WALK_FROM_END);
        const forward = hydrateOpFor(schema, h3);
        expect(forward).not.toBeNull();
        expect(forward as number).toBeLessThan(EXO_WALK_FROM_END);
    });

    it('leaves the <hr> on its forward chain, and records it as the landing it cannot resolve', () => {
        const { schema, hr } = setup();
        // IT KEEPS THE CHAIN — wrong the moment child list `a` has rows, and deliberately so: there is
        // no honest answer for this landing from either direction. `hydrateUnreachable` is what says so.
        const chained = hydrateOpFor(schema, hr);
        expect(chained).not.toBeNull();
        expect(chained as number).toBeLessThan(EXO_WALK_FROM_END);

        // `[start, end)` — the landing and its whole subtree, which for a void element is itself.
        expect(schema.hydrateUnreachable.length).toBe(2);
        expect(schema.protoLandings[schema.hydrateUnreachable[0]]).toBe(hr);
        expect(schema.hydrateUnreachable[1]).toBe(schema.hydrateUnreachable[0] + 1);
    });

    it('gives the SECOND child list an exact stop and the first one none at all', () => {
        const { schema, a, b, footer } = setup();
        // `a` ends at the `<hr>`, which the hydration walk cannot reach — so it is told nothing
        // rather than a slot holding one of its own rows.
        expect(schema.adoptStopSlot[a]).toBe(EXO_ADOPT_STOP_UNKNOWN);
        // `b` ends at the `<footer>`, counted back from the parent's last child, which no number of
        // rows in front of it can shift.
        expect(schema.protoLandings[schema.adoptStopSlot[b]]).toBe(footer);
    });

    it('names `a` as the child list `b` begins after, one static apart', () => {
        const { schema, a, b, hr } = setup();
        expect(schema.hasSeparatedChildLists).toBe(true);
        expect(schema.childListPrevPort[b]).toBe(a);
        expect(schema.childListPrevStatics[b]).toBe(1);
        // `a` itself has nothing in front of it to be published by.
        expect(schema.childListPrevPort[a]).toBe(-1);
        // AND WHAT PUBLICATION REPLACES: the walk alone puts `b`'s beginning at the `<hr>`, which
        // in the server's markup is one of `a`'s rows. `childListPrevPort` is why that slot is not used.
        expect(schema.protoLandings[schema.childListStartSlot[b]]).toBe(hr);
    });

    it('emits no child list CHAIN, because a static stands between the two ports', () => {
        // The mirror table: `childListNextPort` is for two ports with NOTHING between them, and a schema
        // with a separator must not set it — that pass forces both ends to UNKNOWN and strikes the
        // publisher out, which would take `childListPrevPort` away from `b`.
        const { schema, a, b } = setup();
        expect(schema.hasAdjacentChildLists).toBe(false);
        expect(schema.childListNextPort[a]).toBe(-1);
        expect(schema.childListNextPort[b]).toBe(-1);
    });
});
