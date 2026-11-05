// WHAT COMPOSING A PLUGIN COSTS — and, since `scripts/check-plugin-prices.mjs` discovers the packs
// from the exports rather than from a list, the two it currently reports as having no price
// anywhere: `withExoReclaimingText` and `withExoDefaults`.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A PLUGIN SYSTEM IS A SET OF CHOICES, AND A CHOICE WITH NO PRICE IS A SUGGESTION. `packages/dom`
// exports exactly five things a caller composes a backend out of today. THREE OF THEM ARE PRICED IN
// OTHER AXES, and they are named here so nobody prices them twice:
//
//     createExoDelegatedEvents   keystroke-floor, op-click-floor, toggle, template-build
//     withExoHydration           hydrate-floor, template-build
//     withExoPropertyWriters     attr-floor
//
// THE OTHER TWO HAD NO PRICE IN THIS REPOSITORY AT ALL, and both are text writers:
//
//     withExoReclaimingText      puts the RECOVERING text writer back
//     withExoDefaults            the safety bundle, which today IS that one pack
//
// There is no text-write axis under `axes/floors/` — the floors are attr, mount, update, hydrate,
// teardown, keystroke, op-click and ssr — so these two prices had nowhere else to live. TABLE 4
// below is where they live, and it is the live job of this file.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THE TWO PACKS INSTALL, READ OFF THE FILES, BECAUSE THAT IS THE WHOLE DIFFERENCE ────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A BACKEND'S `writers` FIELD DECIDES WHAT A TEXT PORT'S FILL IS. `c.text(port, value)` dispatches
// `schema.setters[index](this.nodes[schema.elem[index]], value)` (`EXO_DOM_NODE_VOCABULARY.ts`), and which node
// lands in that slot travels with the writer: a writer that declares `takesTextNode` is handed the
// element's Text NODE, one that declares nothing is handed the ELEMENT.
//
//   BARE — `EXO_SHIPPED_WRITERS`, which is what `withExoCompiler(new ExoDomBackend())` carries. Its text writer is
//     `setExoText` (`dom/setExoText.ts`): it declares `takesTextNode`, so the instance walk
//     resolved the Text node once at build time and the fill is ONE `.data` store into it. It does
//     not recover: when other software replaces that Text node — a page translator is the common
//     case — the store lands on a node nobody renders and the page silently stops updating.
//
//   RECLAIMING — `withExoReclaimingText(base)` merges ONE field,
//     `writers: (next) => createExoReclaimingTextWriters(next)`, which delegates `attr` and
//     `markupCarries` to whatever stood there and replaces `text` with `exoReclaimingText`
//     (`plugins/exo-reclaiming-text/constants/exoReclaimingText.ts`). That writer declares
//     NOTHING, so it is handed the ELEMENT, and per fill it loads `firstChild`, tests `nodeType`,
//     tests `nextSibling === null`, and only then stores `.data`; where the test fails it assigns
//     `textContent`, which is what puts the page back after a translator.
//
//   DEFAULTS — `withExoDefaults(base)` is `withExoReclaimingText(base)` and nothing else
//     (`plugins/exo-default-bundle/withExoDefaults.ts`: one line, one pack). So TABLE 4's two
//     pack rows install THE SAME WRITER BODY by two different compositions — which is a fact about
//     the bundle today and is printed as one, not assumed. The day the bundle gains a second pack,
//     the two rows stop being the same program and the table already has a row for each.
//
// THE CONTROL IS THE POINT. A composition's price is its difference from the composition without
// it, so a bare `withExoCompiler(new ExoDomBackend())` row stands beside the two pack rows over the SAME component,
// and a second, separately declared bare backend stands beside THAT as the group's null — so a
// reader can tell the pack's price from the instrument's own scatter. There is also a straight-line
// floor (`native·store`: the Text nodes were resolved at mount and kept; one `.data` store each),
// because an axis without one can rank its participants and cannot say what any of them is worth.
//
// NO FIGURE, NO RATIO AND NO ORDERING IS WRITTEN HERE FOR THOSE ROWS. Neither pack has ever been
// measured, and the two sides are not obviously ordered even on paper: the reclaiming writer does
// strictly more work per FILL, and it also makes the port's slot hold the element instead of a Text
// node, so the schema it compiles is a different schema. What this run publishes for TABLE 4 is the
// absolutes, the group's own resolution, and the outcome column — nothing derived from them.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT ELSE IS STILL MEASURED HERE, AND WHY IT IS NOT A PLUGIN ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// TABLES 1 TO 3 price something that stopped being a pack and became a COMPOSITION IN THE WIRE. A
// reactive list is a transition calling `reconcileExoOrder(c.portChildList(port), shown, want, want, build)`
// from `@exodra/list-reconcile`, reconciled by the IDENTITY of the item object; a bound port is a
// transition writing `c.text` from an effect that draws and then subscribes. Neither is a backend field, neither is
// a door, and a page that wants neither links neither. So those tables measure the shipped
// composition against a straight-line floor, and against the one participant that makes the
// comparison a comparison: A DATA LAYER THAT UPDATES INSTEAD OF REPLACING.
//
// TABLE 1 — THE MOUNT. Build `<ul>` and ROWS rows into a fresh container, once per program. A
//     composition can be free at mount and dear on update, and one number would hide it.
//
// TABLE 2 — THE REFETCH. The list source is set to a freshly allocated array of ROWS BRAND-NEW item
//     objects carrying the SAME ids and the SAME labels in the SAME order — one poll, the way a
//     JSON page returns it. `native·rebuild` and `shipped` are told nothing and rebuild; the
//     reconciler's registry recognises nothing, because every item is a new object.
//     `store·bound` is the same refetch through a layer that WRITES INTO permanent entities, so the
//     reconciler is handed the very objects it already holds and builds nothing — and every row's
//     text is held by a BINDING rather than stamped in at build time, so a changed field still
//     reaches the screen. The `fresh` column is READ OUT OF THE LIVE DOM by an untimed probe.
//
// TABLE 3 — THE PARTIAL UPDATE: the array is identical in length, membership and order, and ONE
//     FIELD OF ONE ROW takes a new value. That is by far the commonest thing an application does to
//     a list. `shipped` can only hand the array over again (a fresh array of ROWS−1 of the same
//     objects and one new one) because its only channel carries whole arrays; `store·bound` needs
//     no new channel at all, because the field IS a source and the list is never notified.
//
// THE FLOORS ARE NOT INTERCHANGEABLE BETWEEN THOSE TABLES and that is why there are three of them.
// `native·rebuild` is the floor for "told nothing, so rebuild". For a one-field edit it would be an
// absurd program to measure against, so TABLE 3 has `native·find` (locate the row, write the text —
// what a program that kept no handles must do) and `native·held` (the Text node was kept at mount;
// one `.data` store — the true lower bound for that scene). A row landing UNDER `native·find` is
// not the floor beaten at its own job: a bound port's subscriber holds the node it resolved, so it
// SKIPS THE LOOKUP the floor performs. `native·held` is what keeps that honest.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT WAS STRUCK FROM THIS FILE, AND WHY NOTHING WAS RE-POINTED ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// This axis used to carry four subjects — the children-walk pack, the keyed list, the binding pack,
// and the two reconcilers STACKED. EVERY ONE OF THEM HAS BEEN DELETED FROM THE LIBRARY:
// `withExoChildrenWalk`, `attachExoChildrenByWalk`, `withExoKeyedList`, `attachExoKeyedList`,
// `withExoBinding` and `attachExoList` have no definition anywhere under `packages/*/src`. A
// children reconciler is not a pack at all any more: there is no `children` field on a backend.
//
// SO THOSE ROWS ARE STRUCK AND NOT RE-AIMED. A row that keeps its name and changes its subject is
// how an axis comes to publish a number for a thing it did not measure, so at each former site
// below there is one line naming what the row priced and that the mechanism is gone — and no
// surviving pack was moved in to fill the hole.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE DATA LAYER IS A PARTICIPANT, AND IT IS HAND-ROLLED ON PURPOSE ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A REFETCH THAT PRODUCES NEW OBJECTS IS A REFETCH THROUGH A LAYER THAT THREW IDENTITY AWAY, and
// that is a property of the layer and not of the renderer. This engine reconciles by the identity of
// the item object; a store that gives an entity a PERMANENT SLOT and writes the new field values
// INTO it hands the same objects back, and then the reconciler matches everything and builds
// nothing, with no plugin at all — and the rows stay FRESH, because a row's content is held by its
// binding rather than by a value stamped in at build time.
//
// IT IS NOT `@oimdb`, and the reason is what the row is FOR. The library is a dependency of this
// package, so it was available; what it would have brought is an event queue with a flush point, a
// compute runtime, a derived-index layer and a refusal of any falsy primary key — every one of them
// inside the timed region, and the row would then price `@oimdb` where it is meant to price the
// SHAPE of a layer that keeps identity. `createSlotStore` below is forty lines and every one of them
// is on the clock; a reader can see the whole cost, which is the point. `@oimdb` is what a real
// application uses and it is measured in this suite as a whole app.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE NULL, WHICH THIS SUITE HAS PUBLISHED TABLES WITHOUT AND SHOULD NOT HAVE ─────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A `·twin` ROW IS A SECOND, SEPARATELY DECLARED, IDENTICAL PARTICIPANT — its own `createExoMachine`
// calls, therefore its own declarations and its own compiled schemas, or its own backend instance
// where that is what the measured rows differ in. Its true difference from its original is ZERO, so
// whatever a run reports between the two is what that run CANNOT TELL APART FROM NOTHING, and every
// difference in every table is read against it.
//
// RESOLUTION IS A PROPERTY OF A SAMPLE, NOT OF A TABLE. A table whose rows run at different round
// counts has more than one answer, so every ROUND-COUNT GROUP gets its own figure or the printed
// fact that it has none — never a loan from another group. TABLE 2's `store·bound` is the one row of
// its group in this run and says so by name; everything else here is paired.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HAZARDS, EVERY ONE OF WHICH HAS BITTEN THIS SUITE BEFORE ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE CLOCK. `performance.now()` is clamped in this browser. The quantum is OBSERVED at run time,
// printed, and every timed region must clear MIN_TICKS × it or the run refuses THAT REGION BY NAME
// and prints the batch that would clear it. `toggle` printed the timer thirteen times before this
// discipline existed.
//
// A ROW THAT DOES ALMOST NOTHING NEEDS ITS OWN REPETITION FACTOR, AND THE FACTOR IS PRINTED BESIDE
// IT. A one-field edit answered by one `.data` store needs four figures more rounds than a rebuild
// row before its region clears the clock, and a per-round figure derived from a different number of
// rounds is a different sample.
//
// ROUNDS INSIDE A SCENARIO, NOT SCENARIOS INSIDE A REGION. THIS SUITE CRASHES ON MEMORY PRESSURE —
// `one-and-static` says 25,600 standing outlets is where it goes — so every factor here is spent on
// ROUNDS and the number of standing lists is held at four.
//
// THE PAGES ARE BUILT BEFORE ANYTHING IS TIMED. `list-replace` measured a run where allocating 500
// objects per replace sat INSIDE the timed region; that constant does not cancel out of a ratio, it
// drags every ratio toward 1.00. Every array this file hands to a `setValue` is built in an untimed
// `prep`, and every string it writes is interned once for the process.
//
// SCHEMAS ARE COMPILED IN THE WARM-UP. A backend is the schema-cache key and is compared by POINTER, so
// every backend here is composed ONCE at module load and never inside a render — a fresh backend per
// mount would recompile every schema, markup parse included, inside a timed region.
//
// ONE AXIS PER PROCESS:
//     node scripts/run-one-axis.js plugin-price 100 1
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE GATE ────────────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Every program's MARKUP and its TEXT are compared against the reference before a single region is
// timed, at every stage a comparison is meaningful: after the mount (all four tables), after the
// refetch (table 2), and after one write (table 4). TEXT is checked separately from markup because
// `innerHTML` equality does not imply `textContent` equality for a tree whose text is written by a
// property store — `keystroke-floor` learned that the other way round.
//
// ONE STAGE IS REPORTED AND NOT GATED, and it is the one where the participants are MEANT to
// disagree: table 3 after the edit. Gating it would refuse the axis for producing its own finding.
// IT IS STILL CHECKED: every participant's text is classified against TWO references — the floor's
// text after the edit and the participant's own text before it — so `fresh` and `STALE` are the only
// two answers tolerated, and anything that is neither still refuses. "Not gated" here means "the
// finding is allowed", never "nobody looked".
//
// The gate throws. A divergent participant never reaches the timer.

import { type TExoChildrenPort, type TExoFillDoors, type TExoTextPort } from '@exodra/core';
import {
    ExoDomBackend,
    withExoDefaults,
    withExoReclaimingText,
    type TExoDomBackend,
    type TExoCompilerApi,
    type TExoDomMachine,
    type TExoDomNode,
    type TExoChildList,
    withExoCompiler,
} from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import { gateMarkup, markupOf } from '../../gates/markup-gate';
import { el } from '../../shared/todo-spec';
import { emitRecordedRows, type Scenario } from '../../../harness';
import { createExoSchema } from '@exodra/core';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
} from '@exodra/core';
import { wireExoNode } from '@exodra/core';
import type { TExoDomPortChildList } from '@exodra/dom';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);

function refuse(message: string): never {
    // eslint-disable-next-line no-console
    console.log(`❌ ${message}`);
    throw new Error(message);
}

/** WHAT THE OUTCOME PROBES OBSERVED, so nothing they computed can be folded away. Printed at the end. */
let sink = 0;

/**
 * WHETHER A TABLE 2 PARTICIPANT SURVIVES A REFETCH WHOSE LABELS CHANGED — filled by
 * `outcomeProbe`, untimed, before anything is sampled, and printed as TABLE 2's `fresh` column.
 *
 * IT IS MEASURED AND NOT DECLARED. A column of hand-written "yes"/"no" beside a timing table is a
 * claim about code somebody read; this one is read out of the live DOM of the same programs the
 * timer drives, through the same `push` call.
 */
const REFETCH_FRESH = new Map<string, boolean>();

/** The same for TABLE 3 — `fresh` or `STALE`, classified in `gate()` against two references. */
const PARTIAL_OUTCOME = new Map<string, string>();

/** The same for TABLE 4 — what each composition shows after another program replaced its Text nodes. */
const TEXT_OUTCOME = new Map<string, string>();

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE SHAPE OF THE JOB
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Rows in the list, on TABLES 1, 2 and 3. */
const ROWS = 200;

/** Mounts per timed region on TABLE 1 — 8 × 200 = 1600 rows built per region. */
const MOUNT_REPS = 8;

/** Lists standing at once, on TABLES 2, 3 and 4. Held small ON PURPOSE — see the header. */
const LISTS = 4;

/** Refetch rounds per scenario for the rows that REBUILD every row. 8 × 4 = 32 rounds per region. */
const UPDATE_ROUNDS = 8;

/**
 * Refetch rounds per scenario for the row that BUILDS NOTHING.
 *
 * `store·bound`'s refetch writes ROWS fields and hands the reconciler an array of the very objects
 * it already holds, so at `UPDATE_ROUNDS` its region lands under the clock and the run would refuse
 * a row that is only there to say how small the job became. It buys its region in ROUNDS and not in
 * standing lists, so it costs allocation and no extra live elements. THE FACTOR IS PRINTED IN THE
 * TABLE.
 */
const STORE_ROUNDS = UPDATE_ROUNDS * 8;

/**
 * Rounds per scenario for TABLE 3's rows that answer a one-field edit in O(1).
 *
 * `native·held` is ONE `.data` store — tens of nanoseconds — so its region needs four figures more
 * rounds than a rebuild row's does before it clears the clock. It costs nothing to buy them here:
 * these rounds allocate nothing, mount nothing and leave no extra elements standing, which is the
 * only reason a factor this size is allowed anywhere in this file.
 */
const PARTIAL_ROUNDS = UPDATE_ROUNDS * 1024;

/**
 * HOW MANY DISTINCT REFETCH PAGES EXIST, cycled by round.
 *
 * Every page is a distinct array of distinct item objects, so CONSECUTIVE rounds never share an
 * item and the identity reconciler recognises nothing — which is what a refetch is. Eight of them
 * rather than one per round because a reconciler only ever compares against the array it was handed
 * LAST, so a page reused eight rounds later is indistinguishable from a fresh one.
 */
const PAGE_COUNT = 8;

type TExoPriceRow = { readonly id: number; readonly label: string };

/**
 * THE LABELS AND THE ID TEXTS, INTERNED ONCE FOR THE PROCESS.
 *
 * A refetch here changes NOTHING a row displays — same ids, same labels — so that every
 * participant, whether it rebuilt the row or reused it, must end at byte-identical markup and the
 * gate can be a gate. Interning them makes "this field did not change" true by VALUE as well, so no
 * row is charged for a string comparison another one avoids.
 */
const LABELS: readonly string[] = Array.from({ length: ROWS }, (_, i) => `Row ${i}`);
const ID_TEXT: readonly string[] = Array.from({ length: ROWS }, (_, i) => String(i));

/** One page of freshly allocated items — literally what `JSON.parse` of a poll's body produces. */
const pageOf = (): readonly TExoPriceRow[] =>
    Array.from({ length: ROWS }, (_, i) => ({ id: i, label: LABELS[i] }));

/** Built at module load, never inside a timed region. `PAGES[0]` is what everything mounts with. */
const PAGES: readonly (readonly TExoPriceRow[])[] = Array.from({ length: PAGE_COUNT }, () =>
    pageOf()
);

/** The markup of one row, written out for the census so the census reads nothing off the clock. */
const ROW_MARKUP = '<li class="row"><span class="name">…</span><span class="meta">…</span></li>';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE PARTIAL-UPDATE SCENE'S DATA — TABLE 3. Every array here is built at module load.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * THE ONE ROW TABLE 3 EDITS, and it is in the MIDDLE of the list on purpose.
 *
 * A reconciler that finds the change at index 0 stops early; one that finds it at index 199 has
 * already paid for the whole array. The middle is the only position that charges every participant
 * what an arbitrary edit charges it, and an application's edits are arbitrary.
 */
const PARTIAL_AT = ROWS >> 1;

/**
 * HOW MANY DISTINCT VALUES THE EDITED FIELD CYCLES THROUGH.
 *
 * A round must actually change something or `setValue` dedupes it away
 * (`createExoBenchSource.ts`: `if (next === this.value) return`), and a
 * row that dedupes is a row measuring nothing. Consecutive rounds therefore always take different
 * values; eight of them, interned once, for the reason `PAGE_COUNT` gives.
 */
const EDIT_CYCLE = PAGE_COUNT;

/** The values the edited field takes, interned once for the process. */
const EDIT_TEXT: readonly string[] = Array.from(
    { length: EDIT_CYCLE },
    (_, j) => `Row ${PARTIAL_AT}·${j}`
);

/**
 * THE IDIOMATIC IMMUTABLE UPDATE — a fresh ARRAY holding 199 of `PAGES[0]`'s own item objects and
 * ONE new object at `PARTIAL_AT`.
 *
 * This is what an application that keeps its rows in a plain array writes when one field changes,
 * and it is NOT the same thing TABLE 2 does: there every item is new, here exactly one is. The
 * identity reconciler's position guard therefore hits on 199 rows and misses on one
 * (`reconcileExoOrder.ts`: the common prefix and suffix are skipped by `shown[k] === keys[k]`).
 */
const EDIT_PAGES_ONE: readonly (readonly TExoPriceRow[])[] = EDIT_TEXT.map((label) => {
    const page = PAGES[0].slice();
    page[PARTIAL_AT] = { id: PARTIAL_AT, label };
    return page;
});

// STRUCK: `EDIT_PAGES_ALL` priced `shipped·all` and `keyed` — ROWS brand-new objects of which one
// carried a new label, which existed to show what the KEYED LIST was for. The keyed list is deleted.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE SOURCE EVERY SHELL'S WIRE READS
// ═══════════════════════════════════════════════════════════════════════════════════════════

type TRowSource = TExoBenchSource<readonly TExoPriceRow[]>;

/**
 * THE ONE INDIRECTION EVERY EXODRA ROW PAYS, and it is paid ONCE, at mount, by all of them equally.
 *
 * A shell is rendered with no params, so the source is a module-level variable, rewritten untimed
 * immediately before a render. This is `one-and-static`'s arrangement for the same reason, and it is
 * a module read per LIST, never per row and never per update.
 *
 * TABLES 2 AND 3 REWRITE IT PER SCENARIO, inside `prep`, so every standing list has its own source
 * to notify through. TABLE 1 DOES NOT, and cannot: its render is the thing being timed, so the seed
 * has to happen before the sample, and every rep of a mount sample therefore shares one source. See
 * TABLE1's own note for why that leaves nothing unequal between its rows.
 */
let SOURCE: TRowSource = createExoBenchSource<readonly TExoPriceRow[]>(PAGES[0]);

/** Install a fresh source holding page 0 and hand it back for the scenario to notify through. */
function seedSource(): TRowSource {
    const made = createExoBenchSource<readonly TExoPriceRow[]>(PAGES[0]);
    SOURCE = made;
    return made;
}

// STRUCK: `OP_SOURCE`/`seedOpSource`/`LIST_OPS`/`mountOps` priced `shipped·op` — a list `set` call emitted
// a `set` OP that `attachExoList` turned into a child without re-reading the array. `attachExoList`
// is deleted; the list's transition re-reads `getValue()` whole on every notification, so there is
// no op channel left to price.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE DATA LAYER THAT UPDATES INSTEAD OF REPLACING — a slot table, hand-rolled, on the clock
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// See the header for WHY this is hand-rolled rather than `@oimdb`. What it models is the one
// property that matters to this renderer: an entity has a PERMANENT SLOT, so a refetch WRITES the
// new field values into the object the page is already holding instead of allocating a new one.
//
// EVERY MUTABLE FIELD IS ITS OWN SOURCE, and that half is not decoration. A row that keeps its
// element cannot be fresh if its text was stamped in at build time by `c.text` — the wire ran once
// and nothing re-runs it, under any reconciler. The store's rows are fresh because the row's content
// is written by an effect subscribed to the field, and the store notifies the field.
//
// ONE STORE PER LIST, NEVER ONE FOR THE PROCESS. Four lists stand at once in TABLES 2 and 3; a
// shared slot table would give every field source four subscribers, so one list's write would
// notify four lists' rows and charge one round for four lists' work — and it would promote every
// source off `createExoBenchSource`'s single-subscriber path, which is a different program.

/**
 * ONE ENTITY. `id` is its identity and never changes; `label` is a MUTABLE FIELD, so it is a
 * source rather than a value, and the row binds it.
 */
type TExoSlotEntity = {
    readonly id: number;
    readonly label: TExoBenchSource<string>;
};

interface TExoSlotStore {
    /** What the shell's reconciler reads: always the same ROWS entities. */
    readonly rows: TExoBenchSource<readonly TExoSlotEntity[]>;
    /**
     * ONE REFETCH. Writes every incoming record into its slot and then notifies the list.
     *
     * BOTH HALVES ARE INSIDE TABLE 2's TIMED REGION — the per-record write pass AND the
     * notification — because a row whose store maintenance happened off the clock would not be
     * comparable to a row that pays its whole pass on the clock.
     */
    readonly refetch: (page: readonly TExoPriceRow[]) => void;
    /**
     * ONE FIELD OF ONE ROW — TABLE 3's scene, and the call that needs no array at all. It does NOT
     * notify `rows`, because the array did not change.
     */
    readonly setLabel: (id: number, label: string) => void;
}

function createSlotStore(): TExoSlotStore {
    const slots: TExoSlotEntity[] = new Array<TExoSlotEntity>(ROWS);
    // KEYED BY PK AND NOT INDEXED BY POSITION. A dense `slots[id]` would be cheaper and would be
    // this benchmark flattering itself: a store's pks are arbitrary, so the lookup a real layer
    // performs is a hash lookup, and that is what keeps this row comparable rather than rigged.
    const byId = new Map<number, TExoSlotEntity>();
    for (let i = 0; i < ROWS; i++) {
        const made: TExoSlotEntity = { id: i, label: createExoBenchSource<string>(LABELS[i]) };
        slots[i] = made;
        byId.set(i, made);
    }

    /**
     * PAGE_COUNT DISTINCT ARRAYS OVER THE SAME ENTITIES, allocated here, untimed.
     *
     * The list must be notified with an array object it is not already holding or `setValue`
     * dedupes the notification away and the reconciler never runs — which would make this row
     * cheaper by skipping the pass it is charged for. Cycling prebuilt arrays is how every other
     * row of this axis gets a fresh array without allocating inside the timer (`PAGES`), and it is
     * applied here for the same reason and no other.
     */
    const orders: readonly (readonly TExoSlotEntity[])[] = Array.from({ length: PAGE_COUNT }, () =>
        slots.slice()
    );
    const rows = createExoBenchSource<readonly TExoSlotEntity[]>(orders[0]);
    let tick = 0;

    return {
        rows,
        refetch: (page) => {
            for (let i = 0; i < page.length; i++) {
                const incoming = page[i];
                const slot = byId.get(incoming.id);
                if (slot === undefined) {
                    // THIS STORE ONLY UPDATES. A refetch that brings an id the store has never seen
                    // is an INSERT and one that omits an id is a DELETE, and neither is measured by
                    // this axis — see the closing paragraph. Refusing is what keeps that a stated
                    // limit rather than a silent `continue` that would drop a row and still pass
                    // the markup gate by luck.
                    refuse(
                        `plugin-price: the slot store was handed id ${incoming.id}, which has no ` +
                            'slot. This store only UPDATES — inserts and deletes are outside the ' +
                            'scene and outside every number this axis prints.'
                    );
                }
                slot.label.setValue(incoming.label);
            }
            tick++;
            rows.setValue(orders[tick % PAGE_COUNT]);
        },
        setLabel: (id, label) => {
            const slot = byId.get(id);
            if (slot === undefined) {
                refuse(
                    `plugin-price: the slot store was asked to edit id ${id}, which has no slot`
                );
            }
            slot.label.setValue(label);
        },
    };
}

/**
 * THE STORE THE SHELL'S WIRE READS, for the reason `SOURCE` is a module variable: the shell is
 * rendered with no params. Rewritten untimed immediately before a render.
 */
let STORE: TExoSlotStore = createSlotStore();

function seedStore(): TExoSlotStore {
    const made = createSlotStore();
    STORE = made;
    return made;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE SUBJECTS — declared at module load, so every schema is compiled in the warm-up
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** `<li class="row"><span class="name">…</span><span class="meta">…</span></li>`. */
const rowStamped = () => {
    const MACHINE_SCHEMA = createExoSchema((b) => {
        let name!: TExoTextPort;
        let meta!: TExoTextPort;
        b.el('li', { class: 'row' }, (li) => {
            li.el('span', { class: 'name' }, (s) => {
                name = s.textPort();
            });
            li.el('span', { class: 'meta' }, (s) => {
                meta = s.textPort();
            });
        });
        return { name, meta };
    });
    const mMachine = createExoMachine<TExoDomNode, TExoPriceRow>(MACHINE_SCHEMA, {
        createInitialState: (c, row) => {
            c.text(MACHINE_SCHEMA.ports.name, ID_TEXT[row.id]);
            c.text(MACHINE_SCHEMA.ports.meta, row.label);
        },
    });
    return mMachine;
};

const ROW = rowStamped();

/**
 * THE NULL'S ROW — a SECOND, separately declared, identical component.
 *
 * `rowStamped` is a factory, so each call is its own declaration and its own compiled schema.
 * Reusing `ROW` under a second row name would have shared a schema with `shipped` and understated
 * the scatter, which is the failure mode a null exists to expose rather than to inherit.
 */
const ROW_TWIN = rowStamped();

/**
 * THE SHIPPED LIST — `<ul>` whose one children port follows the source, by the only composition
 * there is: `reconcileExoOrder` over `c.portChildList(port)` and `wireExoNode(c.createExoNode(M))`, run by a transition.
 *
 * THE `<ul>` HOLDS NOTHING BUT THE REGION, so the port OWNS its element and the region's start anchor
 * is `null`. Every participant renders this shape, so no one of them is given a cheaper region than
 * another, and the floor's `textContent = ''` is the same one-assignment clear the child list's
 * `removeAll` is entitled to.
 *
 * THE UNSUBSCRIBE IS THE EFFECT'S RETURN VALUE, and without it the source goes on calling into a
 * child list whose render has been torn down.
 */
const listBound = (row: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA2 = createExoSchema((b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    type TListState = {
        readonly rows: TExoChildList;
        readonly source: TRowSource;
        shown: TExoPriceRow[];
    };
    const mMachine2 = createExoMachine<TExoDomNode, unknown, TListState>(MACHINE_SCHEMA2, {
        createInitialState: (c): TListState => ({
            rows: (c as TExoDomNode & TExoDomPortChildList).portChildList(
                MACHINE_SCHEMA2.ports.rows
            ),
            source: SOURCE,
            shown: [],
        }),
    });
    const machine = composeExoMachine(
        mMachine2,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const want = c.state.source.getValue();
                    c.state.shown = reconcileExoOrder(
                        c.state.rows,
                        c.state.shown,
                        want,
                        want,
                        (item) => wireExoNode(c.createExoNode(row), item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return c.state.source.onChange(() => showRows(c));
                });
            });
        }
    );
    return machine;
};

const LIST_BOUND = listBound(ROW);

/**
 * THE NULL'S SHELL — a SECOND `createExoMachine` call over a SECOND row component.
 *
 * Two rows of the tables below therefore share NOTHING but the source variable and the backend, and
 * their true difference is zero.
 */
const LIST_BOUND_TWIN = listBound(ROW_TWIN);

// STRUCK: `LIST_KEYED` priced the source-driven keyed list of `withExoKeyedList`, a registry keyed
// by an extracted key instead of by object identity. `withExoKeyedList` and `attachExoKeyedList`
// are deleted.

/**
 * THE BOUND ROW — the same two spans, with the mutable field held by a BINDING instead of stamped
 * in at build time.
 *
 * THE DIFFERENCE FROM `ROW` IS ONE CALL AND IT IS THE WHOLE POINT of the store participant:
 *
 *     c.text(P.meta, row.label)            ← ROW: the text is written once, when the row is built
 *     effect: showLabel(c); label.onChange  ← here: written now AND on every notification
 *
 * `name` STAYS A STAMPED WRITE, deliberately: an id is identity and cannot change, so binding it
 * would be one subscription per row bought for a value that never moves — and it would make this
 * row's mount differ from every other row's by TWO subscriptions where the claim only needs one.
 *
 * WHAT THE BINDING COSTS, stated rather than implied: one closure and one `onChange` per row at
 * mount, and one `getValue()` plus one text fill per notification. THAT MOUNT COST IS NOT ON ANY
 * TABLE — see the closing paragraph, which names it as unmeasured rather than letting it pass.
 */
const rowBound = () => {
    const MACHINE_SCHEMA3 = createExoSchema((b) => {
        let name!: TExoTextPort;
        let meta!: TExoTextPort;
        b.el('li', { class: 'row' }, (li) => {
            li.el('span', { class: 'name' }, (s) => {
                name = s.textPort();
            });
            li.el('span', { class: 'meta' }, (s) => {
                meta = s.textPort();
            });
        });
        return { name, meta };
    });
    const mMachine3 = createExoMachine<TExoDomNode, TExoSlotEntity, TExoSlotEntity>(
        MACHINE_SCHEMA3,
        {
            createInitialState: (c, row): TExoSlotEntity => {
                c.text(MACHINE_SCHEMA3.ports.name, ID_TEXT[row.id]);
                return row;
            },
        }
    );
    const machine = composeExoMachine(
        mMachine3,
        (m) =>
            withExoTransitions(m, {
                showLabel: (c) => {
                    c.text(MACHINE_SCHEMA3.ports.meta, c.state.label.getValue());
                },
            }),
        (m) => {
            const { showLabel } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showLabel(c);
                    return c.state.label.onChange(() => showLabel(c));
                });
            });
        }
    );
    return machine;
};

const ROW_BOUND = rowBound();

/** THE FAST GROUP'S NULL ROW — a SECOND, separately declared, identical bound row. */
const ROW_BOUND_TWIN = rowBound();

/**
 * THE STORE'S SHELL — the SHIPPED composition AND NO PLUGIN, which is the participant's entire claim.
 *
 * It is identical to `LIST_BOUND` but for the row component and the source it reads. Whatever this
 * row does that a rebuild does not, it does with the shipped composition; whatever it costs, it
 * costs without a pack.
 */
const listStore = (row: TExoDomMachine): TExoDomMachine => {
    const MACHINE_SCHEMA4 = createExoSchema((b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    type TStoreListState = {
        readonly rows: TExoChildList;
        readonly source: TExoBenchSource<readonly TExoSlotEntity[]>;
        shown: TExoSlotEntity[];
    };
    const mMachine4 = createExoMachine<TExoDomNode, unknown, TStoreListState>(MACHINE_SCHEMA4, {
        createInitialState: (c): TStoreListState => ({
            rows: (c as TExoDomNode & TExoDomPortChildList).portChildList(
                MACHINE_SCHEMA4.ports.rows
            ),
            source: STORE.rows,
            shown: [],
        }),
    });
    const machine = composeExoMachine(
        mMachine4,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const want = c.state.source.getValue();
                    c.state.shown = reconcileExoOrder(
                        c.state.rows,
                        c.state.shown,
                        want,
                        want,
                        (item) => wireExoNode(c.createExoNode(row), item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return c.state.source.onChange(() => showRows(c));
                });
            });
        }
    );
    return machine;
};

const LIST_STORE = listStore(ROW_BOUND);

/**
 * THE FAST GROUP'S NULL SHELL — a SECOND `createExoMachine` call over the SECOND bound row.
 *
 * `store·bound·twin` renders this, seeds its OWN store exactly as `store·bound` does, and runs the
 * identical edit at the identical round count. Its true difference from `store·bound` is zero, so
 * what TABLE 3 reports between the two is what TABLE 3's FAST GROUP cannot tell apart from nothing.
 */
const LIST_STORE_TWIN = listStore(ROW_BOUND_TWIN);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TABLE 4's SUBJECT — one element whose only ports are TEXT ports, written over and over
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE TWO PACKS DIFFER IN ONE THING AND IN NOTHING ELSE: the body that runs when a text port is
// FILLED. So the component they are measured over is a component whose every port is a text port
// and whose every round is a fill of all of them — anything else would dilute the one difference
// with work both sides do identically.
//
// THE WRITES HAPPEN AFTER THE WIRE, through the fill doors the wire handed back. `fillDoors()`
// returns the exonode itself (`EXO_BASE_NODE_VOCABULARY`), and a fill made after the wire records
// nothing in the instance's `filled` bookkeeping but performs the write — which is exactly how an
// application drives a port from an event or a subscription, and is the shape
// `plugins/exo-reclaiming-text/tests/exo-reclaiming-text.test.ts` uses.

/** Text ports in the instance TABLE 4 writes through. */
const WRITE_PORTS = 16;

/** Distinct pages of values, cycled by round, so no round writes what the one before it wrote. */
const WRITE_CYCLE = 8;

/**
 * Fills per round on TABLE 4 — every port of the instance.
 *
 * One fill is a port-index load, a schema load, a setter call and the writer's own body, which is tens
 * of nanoseconds. The round is WRITE_PORTS of them and the factor below buys the rest of the region,
 * for the reason `PARTIAL_ROUNDS` gives: these rounds allocate nothing and leave nothing standing.
 */
const WRITE_ROUNDS = UPDATE_ROUNDS * 128;

/** The values, interned once for the process — every one NON-EMPTY, which is stated because it
 *  decides which arm of the reclaiming writer runs: the empty-value arm takes the Text node OUT and
 *  is a different program, so no round here takes it. */
const WRITE_TEXT: readonly (readonly string[])[] = Array.from({ length: WRITE_CYCLE }, (_, k) =>
    Array.from({ length: WRITE_PORTS }, (_, i) => `cell ${i}·${k}`)
);

/** The markup of the written instance, for the census. */
const WRITE_MARKUP = `<p class="text"><span class="cell">…</span> × ${WRITE_PORTS}</p>`;

/**
 * THE INSTANCE'S FILL DOORS, handed out by the wire.
 *
 * It is a module cell for the reason `SOURCE` is one — a wire takes no arguments but its index — and
 * it is read by `textLive` the instant `render` returns, before any other program mounts.
 */
let WRITE_DOORS: TExoFillDoors | null = null;

/**
 * THROUGH A CALL, and it has to be: an inline `WRITE_DOORS = null` narrows the cell to `null` for
 * the rest of the flow, the compiler cannot see that the wire writes it from inside `render`, and
 * the read below then narrows to `never` at the refusal. An annotation on the read does not help —
 * reproduced both ways. A call the checker does not look through is what resets it.
 */
function clearExoWriteDoors(): void {
    WRITE_DOORS = null;
}

const TEXT_CELLS_SCHEMA = createExoSchema((b) => {
    const cells: TExoTextPort[] = [];
    b.el('p', { class: 'text' }, (p) => {
        for (let i = 0; i < WRITE_PORTS; i++) {
            p.el('span', { class: 'cell' }, (s) => {
                cells.push(s.textPort());
            });
        }
    });
    return { cells };
});
const mTEXT_CELLS = createExoMachine<TExoDomNode>(TEXT_CELLS_SCHEMA, {
    createInitialState: (c) => {
        const first = WRITE_TEXT[0];
        for (let i = 0; i < WRITE_PORTS; i++) c.text(TEXT_CELLS_SCHEMA.ports.cells[i], first[i]);
        WRITE_DOORS = c.fillDoors();
    },
});
const TEXT_CELLS = mTEXT_CELLS;

/** The ports, hoisted once, so a round does no property load the floor does not also do. */
const WRITE_CELL_PORTS: readonly TExoTextPort[] = TEXT_CELLS_SCHEMA.ports.cells;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE BACKENDS, COMPOSED ONCE AT MODULE LOAD AND NEVER INSIDE A RENDER
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A backend is the schema cache key and it is compared by POINTER. One composed per render would hand
// the cache a fresh key every time and recompile every schema — markup parse included — on every
// mount, and every number below would be a measurement of the compiler.
//
// STRUCK: `WALK_BACKEND` priced the children-walk pack —
// `withExoKeyedList(withExoChildrenWalk(withExoBinding(withExoCompiler(new ExoDomBackend()))))`, whose `children`
// field held a reconciler that read the document instead of its own memory. There is no `children`
// field on a backend any more and all three of those packs are deleted.

/** BARE, and it is the whole thing: binding is not a pack, lists are not a door. */
const EXO_BACKEND: TExoDomBackend & TExoCompilerApi = withExoCompiler(new ExoDomBackend());

const LIST_BACKEND: TExoDomBackend & TExoCompilerApi = withExoCompiler(new ExoDomBackend());

/**
 * TABLE 4's NULL — a SECOND bare backend, separately constructed.
 *
 * THE MEASURED ROWS OF THAT TABLE DIFFER IN THE BACKEND INSTANCE and in nothing else, so its null
 * has to differ in the same place: a second component would be a null for a difference nobody is
 * publishing. Its own schema cache, its own compile of the same declaration, and its true
 * difference from `bare` is zero.
 */
const BARE_TWIN_BACKEND: TExoDomBackend & TExoCompilerApi = withExoCompiler(new ExoDomBackend());

/** `withExoReclaimingText` merges ONE field — `writers` — and returns the object it was handed. */
const RECLAIMING_BACKEND: TExoDomBackend & TExoCompilerApi = withExoReclaimingText(
    withExoCompiler(new ExoDomBackend())
);

/** `withExoDefaults` is `withExoReclaimingText` and nothing else today. See the header. */
const DEFAULTS_BACKEND: TExoDomBackend & TExoCompilerApi = withExoDefaults(
    withExoCompiler(new ExoDomBackend())
);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE FLOORS — the same trees by hand: no declaration, no schema, no records, no reconciler
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * The row prototype, compiled ONCE at module scope for the reason every floor in this suite states:
 * a construction inside a measured region would be timing a compiler rather than a program.
 */
const ROW_PROTO = (() => {
    const li = document.createElement('li');
    li.className = 'row';
    const name = document.createElement('span');
    name.className = 'name';
    name.appendChild(document.createTextNode(''));
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.appendChild(document.createTextNode(''));
    li.appendChild(name);
    li.appendChild(meta);
    return li;
})();

function fillNative(into: Node, page: readonly TExoPriceRow[]): void {
    for (let i = 0; i < ROWS; i++) {
        const li = ROW_PROTO.cloneNode(true) as HTMLElement;
        const row = page[i];
        ((li.firstChild as Node).firstChild as Text).data = ID_TEXT[row.id];
        ((li.lastChild as Node).firstChild as Text).data = row.label;
        into.appendChild(li);
    }
}

/** The floor's mount: one `<ul>` and ROWS rows, appended into the container the same way. */
function nativeMount(parent: HTMLElement): HTMLElement {
    const ul = document.createElement('ul');
    fillNative(ul, PAGES[0]);
    parent.appendChild(ul);
    return ul;
}

/**
 * THE FLOOR'S REFETCH — the floor for the job a program TOLD NOTHING does. It clears the owned
 * region with one assignment (which is the move the child list's `removeAll` is entitled to on a
 * port that owns its element, so the floor is not handed a clear the renderer lacks) and rebuilds
 * every row from the prototype.
 */
function nativeRefetch(ul: HTMLElement, page: readonly TExoPriceRow[]): void {
    ul.textContent = '';
    fillNative(ul, page);
}

/**
 * THE PARTIAL JOB'S FIRST FLOOR — locate the row in the document, then write the text.
 *
 * `ul.children[at]` and not `.item(at)`: the index signature on `HTMLCollection` is typed `Element`,
 * so this is one collection index and no null test — which is what a straight-line program that
 * knows its own list writes, and a null test it does not need would be a branch charged to the
 * floor and to nobody else.
 *
 * IT IS NOT THE LOWER BOUND FOR THE SCENE and `native·held` is why: this program kept no handles, so
 * it pays the lookup on every edit. A program that kept the node does not, and neither does a bound
 * port.
 */
function nativePartialFind(ul: HTMLElement, at: number, text: string): void {
    const li = ul.children[at];
    ((li.lastChild as Node).firstChild as Text).data = text;
}

/** The meta Text node of one row, resolved once so `native·held` can keep it. */
function nativeMetaTextAt(ul: HTMLElement, at: number): Text {
    return (ul.children[at].lastChild as Node).firstChild as Text;
}

/**
 * TABLE 4's FLOOR PROTOTYPE — `<p class="text">` and WRITE_PORTS `<span class="cell">`, each with
 * one Text node, which is the tree the schema produces.
 */
const WRITE_PROTO = (() => {
    const p = document.createElement('p');
    p.className = 'text';
    for (let i = 0; i < WRITE_PORTS; i++) {
        const span = document.createElement('span');
        span.className = 'cell';
        span.appendChild(document.createTextNode(''));
        p.appendChild(span);
    }
    return p;
})();

type TExoWriteFloor = { readonly node: HTMLElement; readonly texts: readonly Text[] };

/** The floor's mount: clone the tree, fill it, and keep every Text node. */
function nativeWriteMount(parent: HTMLElement): TExoWriteFloor {
    const node = WRITE_PROTO.cloneNode(true) as HTMLElement;
    const texts: Text[] = new Array<Text>(WRITE_PORTS);
    const first = WRITE_TEXT[0];
    for (let i = 0; i < WRITE_PORTS; i++) {
        const text = node.children[i].firstChild as Text;
        text.data = first[i];
        texts[i] = text;
    }
    parent.appendChild(node);
    return { node, texts };
}

/**
 * WHAT OTHER SOFTWARE DOES TO A PAGE, in the shape that actually breaks a held node: our Text node
 * is DROPPED and a copy of it appears inside a `<font>` the other program inserted. Nothing connects
 * our node to the document afterwards. This is what a page translator does, copied in behaviour from
 * `plugins/exo-reclaiming-text/tests/exo-reclaiming-text.test.ts`.
 *
 * IT IS UNTIMED AND RUNS IN THE OUTCOME PROBE ONLY. The timed rounds of TABLE 4 write into an
 * untouched page, which is the page every application has almost all of the time; what the
 * translator scene decides is not a speed, it is whether the writer can act at all.
 */
function replaceEveryTextNode(host: HTMLElement): void {
    const cells = host.querySelectorAll('span.cell');
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const text = cell.firstChild;
        if (text === null || text.nodeType !== 3) continue;
        const font = document.createElement('font');
        font.appendChild(document.createTextNode(`[${(text as Text).data}]`));
        cell.replaceChild(font, text);
    }
}

// STRUCK: `driftMoveToFront`, `driftRemoveAt`, `driftLive` and `idsOf` served TABLE 3's DRIFT table,
// which priced the walking reconciler's repair of a region another program had mutated. The pack is
// deleted and no surviving composition answers that scene, so the table is gone rather than re-aimed.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════════════════════

interface MountProgram {
    readonly name: string;
    readonly what: string;
    /** Builds the tree into `parent` and hands back its teardown. */
    readonly mount: (parent: HTMLElement) => () => void;
}

/** A mounted subject that can be updated — what TABLES 2, 3 and 4 drive. */
interface Live {
    /** One update round. */
    readonly round: (k: number) => void;
    /**
     * ONE ROUND FIRED BY A NAMED VALUE INSTEAD OF BY A ROUND NUMBER — what the untimed outcome
     * probes push through.
     *
     * `round(k)` cycles prebuilt data so that a timed region does the same work every round; a
     * probe needs to push a SPECIFIC page (one whose labels changed) and read what came out. The
     * two are the same call underneath, and `round` is written in terms of this one wherever a
     * program has it, so a probe can never take a route the timer did not.
     */
    readonly push?: (page: readonly TExoPriceRow[]) => void;
    readonly off: () => void;
}

interface UpdateProgram {
    readonly name: string;
    readonly what: string;
    /** Rounds executed inside ONE timed scenario — printed, because it is not the same for all. */
    readonly rounds: number;
    readonly mount: (parent: HTMLElement) => Live;
}

/** `backend.render(shell, parent)` with a fresh source already installed. */
function mountExodra(
    backend: TExoDomBackend & TExoCompilerApi,
    shell: TExoDomMachine,
    parent: HTMLElement
): { readonly source: TRowSource; readonly off: () => void } {
    const source = seedSource();
    const off = backend.render(shell, parent);
    return { source, off };
}

/**
 * The same, with a fresh SLOT STORE installed — one store per list, never one for the process.
 *
 * THE SHELL IS A PARAMETER because there are two of them and they must be indistinguishable: the
 * null (`store·bound·twin`) has to seed its own store through this same call, or it would differ
 * from the row it is the null FOR in a way that has nothing to do with the instrument.
 */
function mountStore(
    backend: TExoDomBackend & TExoCompilerApi,
    shell: TExoDomMachine,
    parent: HTMLElement
): { readonly store: TExoSlotStore; readonly off: () => void } {
    const store = seedStore();
    const off = backend.render(shell, parent);
    return { store, off };
}

const TABLE1: readonly MountProgram[] = [
    {
        name: 'native',
        what: 'straight-line clone-and-fill — no declaration, no schema, no child records. THE FLOOR for the mount.',
        mount: (parent) => {
            const ul = nativeMount(parent);
            return () => {
                ul.remove();
            };
        },
    },
    // ═══ THE EXODRA ROWS BELOW DO NOT SEED A SOURCE, AND THAT IS DELIBERATE ═══
    //
    // TABLE 1's mount is what is TIMED, so anything a scenario can do beforehand has to happen
    // beforehand — and a `prep`/`measure` split cannot give each rep its own source anyway: the
    // wire reads the module variable at RENDER time, which is inside the timed loop, and every
    // rep's `prep` has already run by then. So one source stands for the whole mount table,
    // installed untimed by `seedSource()` before the gate and again before the phases, and the
    // only asymmetry that leaves is that the exodra rows subscribe to one source where `native`
    // subscribes to nothing. THAT ASYMMETRY IS WHAT A FLOOR IS: a straight-line program has no
    // reactivity, and giving it one would stop it being the floor.
    {
        name: 'shipped',
        what: 'as it ships: withExoCompiler(new ExoDomBackend()), reconcileExoOrder over c.portChildList + wireExoNode(c.createExoNode) in a transition — the identity reconciler, composed in the machine.',
        mount: (parent) => LIST_BACKEND.render(LIST_BOUND, parent),
    },
    {
        name: 'shipped·twin',
        what: 'a SECOND, separately declared, identical participant — the null, whose true difference from `shipped` is zero.',
        mount: (parent) => LIST_BACKEND.render(LIST_BOUND_TWIN, parent),
    },
    // STRUCK from TABLE 1: `walk` priced the children-walk pack at a first placement, `keyed` priced
    // the keyed list's registry write per row, and `keyed·walk` priced the two STACKED. All three
    // packs are deleted from the library.
];

/**
 * A REFETCH ROUND, IN TERMS OF `push`. Every TABLE 2 program is written this way so that the
 * untimed freshness probe drives the participant down the SAME call the timer drives it down —
 * a probe that took its own route would be reporting the freshness of a program nobody timed.
 */
const refetchRound =
    (push: (page: readonly TExoPriceRow[]) => void) =>
    (k: number): void => {
        push(PAGES[(k + 1) % PAGE_COUNT]);
    };

const TABLE2: readonly UpdateProgram[] = [
    {
        name: 'native·rebuild',
        what: "THE FLOOR for the job a program told nothing does: textContent = '' and ROWS fresh rows by hand.",
        rounds: UPDATE_ROUNDS,
        mount: (parent) => {
            const ul = nativeMount(parent);
            const push = (page: readonly TExoPriceRow[]): void => {
                nativeRefetch(ul, page);
            };
            return {
                round: refetchRound(push),
                push,
                off: () => {
                    ul.remove();
                },
            };
        },
    },
    {
        name: 'shipped',
        what: 'the identity reconciler: every item is a new object, so it recognises nothing — ROWS children dropped, ROWS built, ROWS inserted.',
        rounds: UPDATE_ROUNDS,
        mount: (parent) => {
            const m = mountExodra(LIST_BACKEND, LIST_BOUND, parent);
            const push = (page: readonly TExoPriceRow[]): void => {
                m.source.setValue(page);
            };
            return { round: refetchRound(push), push, off: m.off };
        },
    },
    {
        name: 'shipped·twin',
        what: 'the null again, in this table, because resolution is a property of a TABLE and not of a file.',
        rounds: UPDATE_ROUNDS,
        mount: (parent) => {
            const m = mountExodra(LIST_BACKEND, LIST_BOUND_TWIN, parent);
            const push = (page: readonly TExoPriceRow[]): void => {
                m.source.setValue(page);
            };
            return { round: refetchRound(push), push, off: m.off };
        },
    },
    // STRUCK from TABLE 2: `walk` priced the same full rebuild placed by the walking reconciler;
    // `keyed` and `keyed·walk` priced a refetch where every key hit, so nothing was built. All three
    // packs are deleted.
    //
    // ═══ THE DATA LAYER AS A PARTICIPANT — the row that makes this table a comparison ═══
    //
    // WHAT IS INSIDE THE TIMED REGION, stated here because it is the one thing that could make
    // this row incomparable without anybody noticing:
    //
    //   TIMED, every round:  the ROWS `Map.get` lookups of the store's write pass; the ROWS
    //                        `setValue` calls that follow them (each one a compare, and a text fill
    //                        when the value differs); the tick; the `setValue` that notifies the
    //                        list; and everything `reconcileExoOrder` then does with an array of
    //                        ROWS items it already holds.
    //   UNTIMED, in `prep`:  standing the store up (ROWS entities, ROWS sources, the Map) and
    //                        mounting the list, exactly as every other row's mount is untimed; and
    //                        the PAGE_COUNT order arrays, for the reason `PAGES` is prebuilt.
    //
    // WHAT REMAINS UNCOMPARED IS THE MOUNT: this row takes ROWS more subscriptions than any other
    // and no table prices them. Named in the closing paragraph.
    //
    // ON THIS TABLE'S DATA THE STORE WRITES NOTHING TO THE DOM, and that is not a rig — it is the
    // scene. A refetch that re-delivers the same labels changes nothing, and a layer that can TELL
    // discovers that in ROWS compares; `native·rebuild` and `shipped` cannot tell and rebuild the
    // list to find out. TABLE 3 is the scene where the store does have a write to make.
    {
        name: 'store·bound',
        what: 'THE SAME REFETCH THROUGH A LAYER THAT UPDATES: ROWS records written into ROWS permanent entities, then the SHIPPED reconciler — no pack — handed the objects it already holds. Nothing built, and FRESH.',
        rounds: STORE_ROUNDS,
        mount: (parent) => {
            const m = mountStore(LIST_BACKEND, LIST_STORE, parent);
            const push = (page: readonly TExoPriceRow[]): void => {
                m.store.refetch(page);
            };
            return { round: refetchRound(push), push, off: m.off };
        },
    },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TABLE 3 — THE PARTIAL UPDATE. One field of one row, and nothing else, on every route there is.
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// EVERY ROUND OF EVERY ROW APPLIES THE SAME EDIT: row `PARTIAL_AT`'s label becomes
// `EDIT_TEXT[k % EDIT_CYCLE]`. Every participant here CAN express that and lands on identical markup.
//
// TWO ROUND-COUNT GROUPS, BY COST MAGNITUDE, because that is what the clock forces: `PARTIAL_ROUNDS`
// for `native·find` / `native·held` / `store·bound` / `store·bound·twin`, and `STORE_ROUNDS` for
// `shipped` / `shipped·twin`. Both groups hold their own null pair, which is the whole reason this
// table can be read: a figure taken in one sample is not a figure for the other.

const TABLE3: readonly UpdateProgram[] = [
    {
        name: 'native·find',
        what: 'FLOOR A — locate the row in the document, write the text. What a program that kept no handles must do.',
        rounds: PARTIAL_ROUNDS,
        mount: (parent) => {
            const ul = nativeMount(parent);
            return {
                round: (k) => {
                    nativePartialFind(ul, PARTIAL_AT, EDIT_TEXT[k % EDIT_CYCLE]);
                },
                off: () => {
                    ul.remove();
                },
            };
        },
    },
    {
        name: 'native·held',
        what: 'FLOOR B — the Text node was resolved at mount and kept; one `.data` store. The lower bound for the scene.',
        rounds: PARTIAL_ROUNDS,
        mount: (parent) => {
            const ul = nativeMount(parent);
            const text = nativeMetaTextAt(ul, PARTIAL_AT);
            return {
                round: (k) => {
                    text.data = EDIT_TEXT[k % EDIT_CYCLE];
                },
                off: () => {
                    ul.remove();
                },
            };
        },
    },
    {
        name: 'store·bound',
        what: 'ONE FIELD SOURCE WRITTEN. The list source is never touched — the array did not change. One Map.get, one setValue, one bound port. No pack.',
        rounds: PARTIAL_ROUNDS,
        mount: (parent) => {
            const m = mountStore(LIST_BACKEND, LIST_STORE, parent);
            return {
                round: (k) => {
                    m.store.setLabel(PARTIAL_AT, EDIT_TEXT[k % EDIT_CYCLE]);
                },
                off: m.off,
            };
        },
    },
    // ═══ THE FAST GROUP'S NULL, AND THE REASON IT IS `store·bound` THAT IS TWINNED ═══
    //
    // THIS TABLE'S OTHER NULL (`shipped` / `shipped·twin`) IS SAMPLED AT `STORE_ROUNDS`, and the
    // three rows above run at `PARTIAL_ROUNDS` — far more rounds per scenario, at a per-round cost
    // orders of magnitude smaller. A resolution figure taken in one of those samples is not a
    // resolution figure for the other, and the difference this table exists to publish —
    // `store·bound` against `native·find` — lives entirely in this group.
    //
    // `store·bound` IS THE ROW TWINNED AND NOT `native·find`: it is the more elaborate side of that
    // comparison (a Map lookup, a source write, a subscriber call, a `getValue()` re-read and one
    // text fill, against a collection index and one `.data` store), and a null taken over the
    // simpler side would report a smaller scatter than the comparison actually carries. It also
    // exercises the store, the bound port and the schema cache, which a second straight-line program
    // never touches.
    {
        name: 'store·bound·twin',
        what: "THE FAST GROUP'S NULL — a SECOND, separately declared, identical store row at the SAME round count, whose true difference from `store·bound` is zero.",
        rounds: PARTIAL_ROUNDS,
        mount: (parent) => {
            const m = mountStore(LIST_BACKEND, LIST_STORE_TWIN, parent);
            return {
                round: (k) => {
                    m.store.setLabel(PARTIAL_AT, EDIT_TEXT[k % EDIT_CYCLE]);
                },
                off: m.off,
            };
        },
    },
    {
        name: 'shipped',
        what: 'THE IDIOMATIC IMMUTABLE UPDATE: a fresh array, 199 of the SAME objects and one new one. ROWS pointer compares, one identity miss, one row rebuilt.',
        rounds: STORE_ROUNDS,
        mount: (parent) => {
            const m = mountExodra(LIST_BACKEND, LIST_BOUND, parent);
            return {
                round: (k) => {
                    m.source.setValue(EDIT_PAGES_ONE[k % EDIT_CYCLE]);
                },
                off: m.off,
            };
        },
    },
    {
        name: 'shipped·twin',
        what: 'the null for THIS group — same rounds as `shipped`, so their difference is what this group cannot tell apart from nothing.',
        rounds: STORE_ROUNDS,
        mount: (parent) => {
            const m = mountExodra(LIST_BACKEND, LIST_BOUND_TWIN, parent);
            return {
                round: (k) => {
                    m.source.setValue(EDIT_PAGES_ONE[k % EDIT_CYCLE]);
                },
                off: m.off,
            };
        },
    },
    // STRUCK from TABLE 3: `walk` priced the same immutable update placed by the walking reconciler;
    // `shipped·all` priced a layer that reallocates every record, which existed to show what the
    // KEYED LIST was for; `keyed` and `keyed·walk` priced a scene the keyed list could not express at
    // all and were run anyway, printing a STALE outcome. All of those mechanisms are deleted.
    //
    // ALSO STRUCK: `shipped·op` priced the OP CHANNEL — a list `set(index, item)` call emitted a `set` op
    // and `attachExoList` turned it into a child without re-reading the array, so the whole-array
    // pass disappeared. `attachExoList` is deleted and the list's transition re-reads `getValue()`
    // whole on every notification, so there is no op route left to price.
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TABLE 4 — THE TEXT WRITE. The two packs nobody had priced, and a control for each.
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ONE COMPONENT, FOUR BACKENDS. `bare`, `reclaiming` and `defaults` render the SAME `TEXT_CELLS`
// through three separately composed backends, so they differ in the `writers` field and in nothing
// else; `bare·twin` renders it through a SECOND bare backend, which differs in nothing at all and is
// the group's null. Every row's round is WRITE_PORTS fills through the instance's own fill doors.
//
// NO RATIO COLUMN AND NO DERIVED FIGURE IS PRINTED FOR THIS TABLE. Neither pack has been measured
// before, the two sides are not ordered on paper (the reclaiming writer does more work per fill AND
// compiles a different schema, because its slot holds the element rather than a Text node), and a run
// that published a difference it had no basis to interpret would be guessing in print. What this
// table publishes is absolutes, the group's own resolution, and the outcome column.

/**
 * Mount the written instance and hand back a round that fills every port.
 *
 * THE DOORS ARE READ THE INSTANT `render` RETURNS. `WRITE_DOORS` is a module cell the wire writes,
 * for the reason `SOURCE` is one, and nothing else mounts in between.
 */
function textLive(backend: TExoDomBackend & TExoCompilerApi, parent: HTMLElement): Live {
    clearExoWriteDoors();
    const off = backend.render(TEXT_CELLS, parent);
    const doors = WRITE_DOORS;
    if (doors === null) {
        refuse(
            'plugin-price: the text component rendered without handing its fill doors back, so ' +
                'TABLE 4 has nothing to write through. A round that wrote through a stale instance ' +
                'would be timing a detached tree.'
        );
    }
    const ports = WRITE_CELL_PORTS;
    return {
        round: (k) => {
            const page = WRITE_TEXT[(k + 1) % WRITE_CYCLE];
            for (let i = 0; i < WRITE_PORTS; i++) doors.text(ports[i], page[i]);
        },
        off,
    };
}

const TABLE4: readonly UpdateProgram[] = [
    {
        name: 'native·store',
        what: 'THE FLOOR — the Text nodes were resolved at mount and kept; one `.data` store each. No port, no schema, no dispatch.',
        rounds: WRITE_ROUNDS,
        mount: (parent) => {
            const made = nativeWriteMount(parent);
            const texts = made.texts;
            return {
                round: (k) => {
                    const page = WRITE_TEXT[(k + 1) % WRITE_CYCLE];
                    for (let i = 0; i < WRITE_PORTS; i++) texts[i].data = page[i];
                },
                off: () => {
                    made.node.remove();
                },
            };
        },
    },
    {
        name: 'bare',
        what: 'THE CONTROL: withExoCompiler(new ExoDomBackend()), whose EXO_SHIPPED_WRITERS install `setExoText` — it declares takesTextNode, so the slot holds the Text node the walk resolved and a fill is one `.data` store into it.',
        rounds: WRITE_ROUNDS,
        mount: (parent) => textLive(EXO_BACKEND, parent),
    },
    {
        name: 'bare·twin',
        what: 'THE NULL — a SECOND, separately constructed bare backend over the same component, differing in the same place the pack rows differ and in nothing else. Its true difference from `bare` is zero.',
        rounds: WRITE_ROUNDS,
        mount: (parent) => textLive(BARE_TWIN_BACKEND, parent),
    },
    {
        name: 'reclaiming',
        what: 'withExoReclaimingText(withExoCompiler(new ExoDomBackend())) — one merged field, `writers`, whose text writer is `exoReclaimingText`: it declares NOTHING, so the slot holds the ELEMENT, and a fill loads firstChild, tests nodeType, tests nextSibling, then stores `.data` (or assigns textContent where the test fails).',
        rounds: WRITE_ROUNDS,
        mount: (parent) => textLive(RECLAIMING_BACKEND, parent),
    },
    {
        name: 'defaults',
        what: 'withExoDefaults(withExoCompiler(new ExoDomBackend())) — the safety bundle, which today is `withExoReclaimingText` and nothing else, so it installs the SAME `exoReclaimingText` writer by a second composition. A separate backend, a separate schema, the same writer body.',
        rounds: WRITE_ROUNDS,
        mount: (parent) => textLive(DEFAULTS_BACKEND, parent),
    },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE GATE — markup AND text, against the floor, at every stage that is meant to agree
// ═══════════════════════════════════════════════════════════════════════════════════════════

function gateText(stage: string, who: string, reference: HTMLElement, subject: HTMLElement): void {
    const want = reference.textContent ?? '';
    const got = subject.textContent ?? '';
    if (want === got) {
        line(`gate plugin-price/${who} @ ${stage}: identical text — ${want.length} chars`);
        return;
    }
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    refuse(
        `plugin-price: ${who} produces different TEXT from the reference @ ${stage} ` +
            `(${want.length} vs ${got.length} chars, first difference at ${at}) — ` +
            `reference "…${want.slice(Math.max(0, at - 20), at + 40)}…" against ` +
            `"…${got.slice(Math.max(0, at - 20), at + 40)}…"`
    );
}

function gate(): void {
    // ── TABLE 1: one mount per program, against the FLOOR. ──────────────────────────────────
    //
    // THE SOURCE THE MOUNT TABLE'S SHELLS READ, installed here, untimed. See TABLE1's own note.
    seedSource();
    const ref = el();
    const refOff = TABLE1[0].mount(ref);
    line(
        `TABLE 1 reference (${TABLE1[0].name}): ${markupOf(ref).length} chars, ` +
            `${ref.querySelectorAll('*').length} elements, ${ROWS} rows`
    );
    for (let i = 1; i < TABLE1.length; i++) {
        const p = TABLE1[i];
        const c = el();
        const off = p.mount(c);
        gateMarkup('plugin-price', 'mount', p.name, ref, c);
        gateText('mount', p.name, ref, c);
        off();
        c.remove();
    }
    refOff();
    ref.remove();

    // ── TABLE 2: mount, then ONE refetch round, against the FLOOR at both stages. ────────────
    const ref2 = el();
    const h2 = TABLE2[0].mount(ref2);
    const others: Array<{ p: UpdateProgram; c: HTMLElement; h: Live }> = [];
    for (let i = 1; i < TABLE2.length; i++) {
        const p = TABLE2[i];
        const c = el();
        const h = p.mount(c);
        gateMarkup('plugin-price', 'mount', p.name, ref2, c);
        gateText('mount', p.name, ref2, c);
        others.push({ p, c, h });
    }
    h2.round(0);
    for (const o of others) {
        o.h.round(0);
        gateMarkup('plugin-price', 'after refetch', o.p.name, ref2, o.c);
        gateText('after refetch', o.p.name, ref2, o.c);
    }
    for (const o of others) {
        o.h.off();
        o.c.remove();
    }
    h2.off();
    ref2.remove();

    // ── TABLE 3: mount (GATED), then ONE partial edit (CLASSIFIED, not gated). ───────────────
    //
    // WHAT REPLACES THE GATE IS STRICTER THAN "NOT CHECKED". Every participant's text is compared
    // against TWO references: the floor's text AFTER the edit, and its own text BEFORE it. Matching
    // the first is `fresh`; matching the second is `STALE`, and means the participant did nothing
    // this scene can see. Matching NEITHER is a participant doing something nobody described, and
    // that still refuses — so the only divergence this axis tolerates is one it names.
    const ref3 = el();
    const r3 = TABLE3[0].mount(ref3);
    const partial: Array<{ p: UpdateProgram; c: HTMLElement; h: Live; before: string }> = [];
    for (let i = 1; i < TABLE3.length; i++) {
        const p = TABLE3[i];
        const c = el();
        const h = p.mount(c);
        gateMarkup('plugin-price', 'mount', p.name, ref3, c);
        gateText('mount', p.name, ref3, c);
        partial.push({ p, c, h, before: c.textContent ?? '' });
    }
    r3.round(0);
    const want3 = ref3.textContent ?? '';
    PARTIAL_OUTCOME.set(TABLE3[0].name, 'fresh');
    sink += want3.length;
    for (const o of partial) {
        o.h.round(0);
        const got = o.c.textContent ?? '';
        sink += got.length;
        if (got === want3) {
            PARTIAL_OUTCOME.set(o.p.name, 'fresh');
            line(
                `gate plugin-price/${o.p.name} @ one field changed: FRESH — identical to the ` +
                    `floor, ${got.length} chars`
            );
            continue;
        }
        if (got === o.before) {
            PARTIAL_OUTCOME.set(o.p.name, 'STALE');
            line(
                `gate plugin-price/${o.p.name} @ one field changed: STALE — byte for byte what it ` +
                    'was BEFORE the edit. The new value has no route to the screen through this ' +
                    'participant.'
            );
            continue;
        }
        let at = 0;
        while (at < want3.length && at < got.length && want3[at] === got[at]) at++;
        refuse(
            `plugin-price: "${o.p.name}" @ one field changed matches NEITHER the floor's text ` +
                `after the edit NOR its own text before it (${want3.length} vs ${got.length} ` +
                `chars, first difference at ${at}) — it is neither fresh nor stale, which is a ` +
                'participant doing something this axis has no name for. ' +
                `floor "…${want3.slice(Math.max(0, at - 20), at + 40)}…" against ` +
                `"…${got.slice(Math.max(0, at - 20), at + 40)}…"`
        );
    }
    for (const o of partial) {
        o.h.off();
        o.c.remove();
    }
    r3.off();
    ref3.remove();

    // ── TABLE 4: mount AND one write round, both GATED against the straight-line floor. ──────
    //
    // BOTH STAGES AGREE OR THE AXIS REFUSES, and that is what makes the two pack rows comparable to
    // the control at all: on an untouched page the recovering writer is supposed to be
    // indistinguishable from the shipped one, byte for byte, which the pack's own suite claims about
    // that FILE and this gate claims about THIS RUN. Where they differ is the scene the outcome
    // probe below pushes, and that one is reported rather than gated.
    const ref4 = el();
    const r4 = TABLE4[0].mount(ref4);
    const written: Array<{ p: UpdateProgram; c: HTMLElement; h: Live }> = [];
    for (let i = 1; i < TABLE4.length; i++) {
        const p = TABLE4[i];
        const c = el();
        const h = p.mount(c);
        gateMarkup('plugin-price', 'mount', p.name, ref4, c);
        gateText('mount', p.name, ref4, c);
        written.push({ p, c, h });
    }
    r4.round(0);
    for (const o of written) {
        o.h.round(0);
        gateMarkup('plugin-price', 'after one write round', o.p.name, ref4, o.c);
        gateText('after one write round', o.p.name, ref4, o.c);
    }
    for (const o of written) {
        o.h.off();
        o.c.remove();
    }
    r4.off();
    ref4.remove();
}

/**
 * THE TWO THINGS THIS AXIS SAYS BY NAME RATHER THAN BY A NUMBER — observed once, untimed.
 *
 * (1) WHAT REUSE COSTS — pushed through EVERY PARTICIPANT OF TABLE 2 and not only one of them,
 *     because the answer is what TABLE 2's `fresh` column prints and a column filled for some rows
 *     and asserted for the rest is a column nobody can read. A refetch whose LABELS CHANGED goes
 *     down each participant's own `push`, which is the same call the timer drives it down. The
 *     rebuilding rows show the new labels because they rebuilt; `store·bound` shows them WITHOUT
 *     rebuilding, because its text is held by a binding. That second case is the finding, and it is
 *     measured in characters on screen, not asserted.
 *
 * (2) WHAT THE TWO TEXT PACKS BUY — the scene they exist for, which is not a speed. Another program
 *     replaces every Text node in the instance (what a page translator does), and then every
 *     participant is pushed down the same write its timed round takes. The shipped writer holds the
 *     node the walk resolved, so its store lands on a node nobody renders; the straight-line floor
 *     kept its own node and loses the page for exactly the same reason. The reclaiming writer was
 *     handed the ELEMENT, so it can still find out what is in there and put the page back. It is
 *     printed as an outcome, never as a refusal, because a refusal here would abort the run for
 *     producing its finding.
 */
function outcomeProbe(): void {
    line('');
    line('OUTCOME 1 — a refetch whose LABELS CHANGED, pushed through EVERY participant of TABLE 2');
    line('  row              what the page shows      first 40 chars');
    const changed: readonly TExoPriceRow[] = Array.from({ length: ROWS }, (_, i) => ({
        id: i,
        label: `CHANGED ${i}`,
    }));
    for (const p of TABLE2) {
        const c = el();
        const h = p.mount(c);
        const push = h.push;
        if (push === undefined) {
            refuse(
                `plugin-price: TABLE 2's "${p.name}" has no \`push\`, so this probe cannot drive ` +
                    'it down the same call the timer drives it down. A freshness column read off a ' +
                    'different route is a column about a different program.'
            );
        }
        push(changed);
        const text = c.textContent ?? '';
        const fresh = text.includes('CHANGED 0') && !text.includes('Row 0');
        REFETCH_FRESH.set(p.name, fresh);
        sink += text.length;
        line(
            `  ${p.name.padEnd(15)}` +
                `${(fresh ? 'shows the new labels' : 'SHOWS THE OLD LABELS').padEnd(24)}` +
                `"${text.slice(0, 40)}"`
        );
        h.off();
        c.remove();
    }
    line(
        '  WHAT REUSE MEANS, and it is not a gap to be closed: a wire runs ONCE, when its row is ' +
            'built, and re-running it over a standing element would re-fill every port, re-attach ' +
            "every listener and re-take every subscription — a rebuild wearing the old element's " +
            'clothes. A row that must track its entity BINDS its fields from sources and reads ' +
            'nothing but the id at build time, which is exactly what `store·bound` does and why it ' +
            'keeps its elements AND its freshness with no pack at all.'
    );

    line('');
    line(
        'OUTCOME 2 — another program REPLACED every Text node (what a page translator does), then ' +
            'the same write every timed round of TABLE 4 makes'
    );
    line('  row              what the page shows        first 40 chars');
    for (const p of TABLE4) {
        const c = el();
        const h = p.mount(c);
        replaceEveryTextNode(c);
        const before = c.textContent ?? '';
        h.round(0);
        const after = c.textContent ?? '';
        const wanted = WRITE_TEXT[1];
        const recovered = after.startsWith(wanted[0]) && !after.includes('[');
        TEXT_OUTCOME.set(p.name, recovered ? 'recovers' : 'LOST');
        sink += after.length;
        line(
            `  ${p.name.padEnd(15)}` +
                `${(recovered ? 'PUT THE PAGE BACK' : 'writes nowhere visible').padEnd(26)}` +
                `"${after.slice(0, 40)}"`
        );
        if (!recovered && after !== before) {
            line(
                `    and it is not stale either: "${before.slice(0, 24)}" became ` +
                    `"${after.slice(
                        0,
                        24
                    )}", which is this axis reporting what it saw rather than ` +
                    'what it expected.'
            );
        }
        h.off();
        c.remove();
    }
    line(
        '  WHAT THIS COLUMN IS AND IS NOT: it is the CAPABILITY the two pack rows of TABLE 4 are ' +
            'paying for, read out of the live DOM of the same programs the timer drives. It is not ' +
            'a recommendation and it is not weighed against the timing — a page that no extension ' +
            'and no translator ever touches never reaches this scene, and that is the page the ' +
            'timed rounds measure.'
    );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE CLOCK, OBSERVED — copied from `one-and-static`, which copied it from `mount-floor`.
// ═══════════════════════════════════════════════════════════════════════════════════════════

function observeTimerQuantum(): number {
    let smallest = Infinity;
    for (let s = 0; s < 100; s++) {
        const t0 = performance.now();
        let t1 = performance.now();
        while (t1 === t0) t1 = performance.now();
        const step = t1 - t0;
        if (step > 0 && step < smallest) smallest = step;
    }
    return smallest === Infinity ? 0.1 : smallest;
}

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement, not rounding. */
const MIN_TICKS = 3;

interface Stat {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
}

function stat(xs: number[]): Stat {
    const s = [...xs].sort((a, b) => a - b);
    const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    return { min: s[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: s[s.length - 1] };
}

/**
 * A `Stat` IN THE UNIT ITS TABLE PRINTS — and the reason it exists is the one failure the
 * machine-readable line was introduced to end.
 *
 * `sampleOnce` returns MILLISECONDS per unit; TABLE 1 prints nanoseconds per row and TABLES 2, 3
 * and 4 print microseconds per round. `emitRecordedRows` carries the unit on every row, so emitting
 * a millisecond number under the label `µs` would be 1000× wrong in the direction that flatters,
 * silently, in a recorded file nobody reopens. The conversion happens HERE, once, beside the label
 * it is converted for.
 */
function scaledStat(s: Stat, by: number): Stat {
    return {
        min: s.min * by,
        p25: s.p25 * by,
        median: s.median * by,
        p75: s.p75 * by,
        max: s.max * by,
    };
}

function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

interface Phase {
    readonly name: string;
    /** Scenarios prepared per timed region. */
    readonly reps: number;
    /** Units per scenario — ROWS on the mount table, ROUNDS on the update tables. */
    readonly per: number;
    readonly what: string;
    readonly prep: () => Scenario;
}

function sampleOnce(phase: Phase): number {
    const reps = phase.reps;
    const scenarios: Scenario[] = [];
    for (let b = 0; b < reps; b++) scenarios.push(phase.prep());
    gcIfPossible();
    const t0 = performance.now();
    for (let b = 0; b < reps; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < reps; b++) scenarios[b].cleanup();
    return dt / (reps * phase.per);
}

/** The whole timed region for one sample of a phase — what the clock check is asked about. */
function regionOf(phase: Phase, perUnit: number): number {
    return perUnit * phase.reps * phase.per;
}

function runPhases(phases: readonly Phase[], rounds: number): Map<string, number[]> {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);
    const times = new Map<string, number[]>();
    for (const p of phases) times.set(p.name, []);
    for (let r = 0; r < rounds; r++) {
        // ROTATED, so no row always runs first in a round and inherits the same cache state.
        const shift = r % phases.length;
        const forward = (r & 1) === 0;
        for (let k = 0; k < phases.length; k++) {
            const at = forward
                ? (k + shift) % phases.length
                : (shift + phases.length - 1 - k) % phases.length;
            const p = phases[at];
            (times.get(p.name) as number[]).push(sampleOnce(p));
        }
    }
    return times;
}

/**
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO, in two numbers rather than one.
 *
 *   bias   |median(a) − median(b)|. On its own it is optimistic: two medians are free to cancel.
 *   noise  the MEDIAN of the per-round |a_r − b_r|. Both halves of a null are sampled in the same
 *          round, adjacent in the rotation, so this is the round-to-round scatter that ANY
 *          comparison of two rows in the table carries. It cannot cancel.
 */
interface Null {
    readonly bias: number;
    readonly noise: number;
    readonly resolution: number;
}

function pairedNull(a: number[], b: number[]): Null {
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    for (let r = 0; r < n; r++) diffs[r] = Math.abs(a[r] - b[r]);
    const d = stat(diffs);
    const bias = Math.abs(stat(a).median - stat(b).median);
    return { bias, noise: d.median, resolution: Math.max(bias, d.median) };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// RESOLUTION IS A PROPERTY OF A SAMPLE, SO IT IS COMPUTED PER ROUND-COUNT GROUP AND NOT PER TABLE
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A table whose rows all run the same number of units per scenario has ONE sample condition and one
// answer. TABLES 2 AND 3 DO NOT: their rows run at round counts chosen by cost magnitude, and a
// figure taken between two rows of one group is a figure about that group. Printing it once, at the
// foot of the table, invited every row above to be read against it — which for a fast group would be
// orders of magnitude wrong in the direction that flatters, since a floor that swallows everything
// can never be caught calling a real difference noise.

/**
 * THE NULL PAIRS THIS FILE DECLARES — two separately declared participants whose true difference is
 * ZERO by construction.
 *
 * They are NAMED here rather than discovered by a `·twin` suffix. A suffix rule would pair whatever
 * happened to be called `x·twin` with whatever happened to be called `x`, and the day somebody adds
 * a third participant whose name ends that way the file would report a null between two programs
 * that are not each other's twin — silently, in the direction nobody checks.
 */
const NULL_PAIRS: readonly (readonly [string, string])[] = [
    ['shipped', 'shipped·twin'],
    ['store·bound', 'store·bound·twin'],
    ['bare', 'bare·twin'],
];

/**
 * A GROUP'S NULL AND THE PAIR IT WAS TAKEN OVER, IN ONE VALUE.
 *
 * They are one object and not two fields so that a figure can never be printed without the pair it
 * came from: "resolution 0.000123 µs" is unreadable, and "sampled between `bare` and `bare·twin` at
 * 1024 rounds" is what makes it a claim somebody can check.
 */
interface TExoGroupNull {
    readonly pair: readonly [string, string];
    readonly nulls: Null;
}

/** One ROUND-COUNT GROUP of one table, with its own null or with the fact that it has none. */
interface TExoRoundGroup {
    /** Units per scenario every member of this group is sampled at — rounds, or rows on TABLE 1. */
    readonly per: number;
    readonly members: readonly string[];
    /** `null` when the group holds no pair. A group with no null publishes that, never a loan. */
    readonly measured: TExoGroupNull | null;
}

/**
 * SPLIT A TABLE INTO ITS ROUND-COUNT GROUPS AND GIVE EACH ONE THE NULL THAT BELONGS TO IT.
 *
 * A pair whose halves are sampled at DIFFERENT round counts is refused rather than skipped: it would
 * leave both groups reporting "no pair" while every sentence in this file says a null exists, and a
 * missing figure that reads as an oversight is worse than a loud stop.
 */
function roundGroups(
    phases: readonly Phase[],
    series: Map<string, number[]>,
    table: string
): readonly TExoRoundGroup[] {
    for (const [a, b] of NULL_PAIRS) {
        const pa = phases.find((p) => p.name === a);
        const pb = phases.find((p) => p.name === b);
        if (pa === undefined || pb === undefined) continue;
        if (pa.per !== pb.per) {
            refuse(
                `plugin-price: on the ${table} table the null pair "${a}"/"${b}" is sampled at ` +
                    `${pa.per} against ${pb.per} units per scenario. A null taken across two ` +
                    'sample conditions is a null for neither of them, and every difference this ' +
                    'table prints would then be read against a figure from somewhere else.'
            );
        }
    }
    const byPer = new Map<number, string[]>();
    for (const p of phases) {
        const got = byPer.get(p.per);
        if (got === undefined) byPer.set(p.per, [p.name]);
        else got.push(p.name);
    }
    const groups: TExoRoundGroup[] = [];
    for (const [per, members] of byPer) {
        const pair = NULL_PAIRS.find(([a, b]) => members.includes(a) && members.includes(b));
        let measured: TExoGroupNull | null = null;
        if (pair !== undefined) {
            const one = series.get(pair[0]) as number[];
            const other = series.get(pair[1]) as number[];
            measured = { pair, nulls: pairedNull(one, other) };
        }
        groups.push({ per, members, measured });
    }
    // DESCENDING BY ROUND COUNT, which on every table here is ascending by per-round cost — the
    // order the rows themselves are printed in.
    groups.sort((x, y) => y.per - x.per);
    return groups;
}

/**
 * THE GROUP A ROW BELONGS TO — the only group whose figure a difference involving that row may be
 * read against.
 */
function groupOf(groups: readonly TExoRoundGroup[], name: string, table: string): TExoRoundGroup {
    const got = groups.find((g) => g.members.includes(name));
    if (got === undefined) {
        refuse(`plugin-price: "${name}" belongs to no round-count group of the ${table} table`);
    }
    return got;
}

/** The null of a group that MUST have one — a refusal rather than a fallback, because a fallback here is a loan. */
function requireNull(group: TExoRoundGroup, table: string): TExoGroupNull {
    const measured = group.measured;
    if (measured === null) {
        refuse(
            `plugin-price: the ${table} table's ${group.per}-unit group (${group.members.join(
                ', '
            )}) ` +
                'has no null pair, and something above tried to read a difference against it. ' +
                'Declare a twin for one of its rows, or stop publishing that difference.'
        );
    }
    return measured;
}

/**
 * PRINT ONE RESOLUTION FIGURE PER GROUP, each labelled with its group and with the pair it was taken
 * over — and, for a group with no pair, the printed fact that it has none.
 *
 * `scale` converts the sample's milliseconds into the unit the table prints, and `unit` names it, for
 * the reason `scaledStat` exists: a millisecond figure under a `µs` label is 1000× wrong in the
 * flattering direction and nothing in the line would say so.
 */
function printGroupResolutions(
    groups: readonly TExoRoundGroup[],
    scale: number,
    unit: string,
    unitOfPer: string,
    noteFor: (group: TExoRoundGroup) => string
): void {
    const f6 = (x: number): string => x.toFixed(6);
    line(
        `  RESOLUTION, PER ${unitOfPer.toUpperCase()}-COUNT GROUP — a null is a property of a ` +
            'SAMPLE, so a table sampled at more than one round count has more than one answer:'
    );
    for (const g of groups) {
        line(`    ${String(g.per).padStart(6)} ${unitOfPer}/scenario · ${g.members.join(', ')}`);
        const m = g.measured;
        if (m === null) {
            line(
                `        NO NULL PAIR AT THIS ${unitOfPer.toUpperCase()} COUNT IN THIS RUN. Nothing ` +
                    "here says what this group's scatter is, and no other group's figure may be " +
                    `quoted against it. ${noteFor(g)}`
            );
            continue;
        }
        line(
            `        resolution ${f6(m.nulls.resolution * scale)} ${unit} per ${unitOfPer} (bias ` +
                `${f6(m.nulls.bias * scale)} ${unit}, round-to-round noise ` +
                `${f6(m.nulls.noise * scale)} ${unit}) — sampled between \`${m.pair[0]}\` and ` +
                `\`${m.pair[1]}\`, which share this group's ${unitOfPer} count. A difference ` +
                'between two rows OF THIS GROUP that is under this is not a size.'
        );
    }
}

/** Turn an update table into phases: one scenario mounts one subject and runs `rounds` rounds. */
function updatePhases(table: readonly UpdateProgram[], batch: number): readonly Phase[] {
    return table.map((p) => ({
        name: p.name,
        reps: LISTS * Math.max(1, batch),
        per: p.rounds,
        what: p.what,
        prep: (): Scenario => {
            // THE MOUNT IS UNTIMED. These tables measure the update, not the build.
            const c = el();
            const h = p.mount(c);
            return {
                measure: () => {
                    for (let k = 0; k < p.rounds; k++) h.round(k);
                },
                cleanup: () => {
                    h.off();
                    c.remove();
                },
            };
        },
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════

export function benchmarkPluginPrice(rounds = 100, batch = 1): void {
    const f4 = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const ns = (ms: number): string => (ms * 1e6).toFixed(1);
    const us = (ms: number): string => (ms * 1e3).toFixed(4);

    const quantum = observeTimerQuantum();
    line(
        `plugin-price: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run refuses that region by name'
    );

    line('');
    line(
        'WHAT IS BEING PRICED, AND HOW EACH ONE IS COMPOSED — read off the files, before any number'
    );
    line('  withExoReclaimingText   A PACK AND A DECORATOR. It merges ONE field — `writers` —');
    line('                          whose text writer becomes `exoReclaimingText`. That writer');
    line('                          declares NOTHING, so the compiler puts the ELEMENT in the');
    line("                          port's slot and every fill loads firstChild, tests nodeType,");
    line('                          tests nextSibling and then stores `.data`; where the test');
    line('                          fails it assigns textContent instead, which is the whole');
    line('                          mechanism by which a page survives another program replacing');
    line('                          its Text node. IT HAD NO PRICE ANYWHERE until TABLE 4.');
    line('  withExoDefaults         THE SAFETY BUNDLE, and today it is one line that calls');
    line('                          withExoReclaimingText and nothing else. So its row installs');
    line('                          the SAME writer body by a second composition, over its own');
    line('                          backend and its own compiled schema. That is a fact about the');
    line('                          bundle as it stands, printed rather than assumed: the day it');
    line('                          gains a second pack the two rows stop being the same program,');
    line('                          and the table already carries a row for each. ALSO UNPRICED.');
    line('  the SHIPPED WRITER      The control both pack rows are read against: `setExoText`,');
    line('                          which declares takesTextNode, so the instance walk resolved');
    line('                          the Text node once at build time and a fill is one `.data`');
    line(
        '                          store. A bare `withExoCompiler(new ExoDomBackend())` is the whole of it —'
    );
    line('                          there is no pack to compose and nothing to switch off.');
    line('  the DATA LAYER          NOT A PLUGIN AT ALL, and that is its claim (TABLES 2, 3).');
    line('                          `store·bound` runs the SHIPPED composition —');
    line(
        '                          reconcileExoOrder over c.portChildList and wireExoNode(c.createExoNode) — and what'
    );
    line('                          differs is that its records live in permanent slots a refetch');
    line('                          WRITES INTO, so the reconciler is handed the objects it');
    line('                          already holds, and that each mutable field is its own source');
    line('                          the row BINDS, so a kept row is a FRESH row. It is');
    line('                          hand-rolled rather than `@oimdb` so that every nanosecond on');
    line('                          its line belongs to the SHAPE of such a layer and not to a');
    line('                          particular library — see the file header.');
    line('  THREE PACKS ARE PRICED ELSEWHERE and are not re-priced here:');
    line('                          createExoDelegatedEvents (keystroke-floor, op-click-floor,');
    line('                          toggle, template-build), withExoHydration (hydrate-floor,');
    line('                          template-build) and withExoPropertyWriters (attr-floor).');

    line('');
    gate();
    outcomeProbe();

    line('');
    line('CENSUS — counted off the schemas and the constants, nothing measured');
    line(`  rows per list                 ${ROWS}`);
    line(`  the row                       ${ROW_MARKUP}`);
    line(`  ports in ROW's schema         ${ROW.declaration.portList.length} (two text ports)`);
    line(
        `  ports in the shell's schema   ${LIST_BOUND.declaration.portList.length} (one children port)`
    );
    line(
        `  ports in the bound row        ${ROW_BOUND.declaration.portList.length} — the SAME schema as ` +
            '`ROW`. It differs in ONE effect: it writes `c.text(P.meta, label.getValue())` and subscribes ' +
            'to `label`, where `ROW` writes `c.text(P.meta, row.label)` once, which is the whole of what keeps a kept row fresh'
    );
    line(`  the written instance          ${WRITE_MARKUP}`);
    line(
        `  ports in it                   ${TEXT_CELLS.declaration.portList.length} text ports, all ` +
            `${WRITE_PORTS} filled per round (TABLE 4)`
    );
    line(`  mounts per timed region       ${MOUNT_REPS * Math.max(1, batch)} (TABLE 1)`);
    line(
        `  subjects standing per region  ${
            LISTS * Math.max(1, batch)
        } (TABLES 2, 3 and 4) — held ` +
            'small on purpose; the region is bought in ROUNDS, because this suite crashes on memory ' +
            'pressure'
    );
    line(
        `  refetch pages, prebuilt       ${PAGE_COUNT} × ${ROWS} items, allocated at module load — ` +
            'never inside a timed region'
    );
    line(
        `  the slot store, per list      ${ROWS} entities, ${ROWS} field sources, one Map, and ` +
            `${PAGE_COUNT} order arrays over the same entities — stood up in an untimed \`prep\`, ` +
            'one per list, never one for the process'
    );
    line(
        `  the partial scene             row ${PARTIAL_AT} of ${ROWS}, one field, ${EDIT_CYCLE} ` +
            'values cycled so no round is deduped away (TABLE 3)'
    );
    line(
        `  the write scene               ${WRITE_CYCLE} pages of ${WRITE_PORTS} NON-EMPTY values, ` +
            'interned once, cycled by round so no round writes what the one before it wrote and no ' +
            "round takes the reclaiming writer's empty-value arm (TABLE 4)"
    );
    line(
        `  null pairs declared           ${NULL_PAIRS.map(([a, b]) => `${a}/${b}`).join(', ')} — ` +
            'each a SECOND, separately declared, identical participant whose true difference from ' +
            'its original is zero. A pair answers only for the rows sampled at ITS OWN round ' +
            'count, so a table spanning several counts prints several figures and names the group ' +
            'each one belongs to'
    );
    line(`  sink so far                   ${sink} (read so nothing folds away)`);

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLE 1 — THE MOUNT
    // ═══════════════════════════════════════════════════════════════════════════════════════

    const mountPhases: readonly Phase[] = TABLE1.map((p) => ({
        name: p.name,
        reps: MOUNT_REPS * Math.max(1, batch),
        per: ROWS,
        what: p.what,
        prep: (): Scenario => {
            const c = el();
            let off: (() => void) | null = null;
            return {
                measure: () => {
                    off = p.mount(c);
                },
                cleanup: () => {
                    if (off !== null) off();
                    c.remove();
                },
            };
        },
    }));

    // THE MOUNT TABLE'S SHARED SOURCE, re-installed here because `gate()` and `outcomeProbe()`
    // have both moved `SOURCE` on since it was last set. Untimed, once, before any warm-up.
    seedSource();
    const mountSeries = runPhases(mountPhases, rounds);
    const mountStat = new Map<string, Stat>();
    for (const p of mountPhases) mountStat.set(p.name, stat(mountSeries.get(p.name) as number[]));
    const perRow = (name: string): number => (mountStat.get(name) as Stat).median;
    const perMount = (name: string): number => perRow(name) * ROWS;

    // EVERY ROW OF THIS TABLE IS SAMPLED OVER THE SAME NUMBER OF ROWS PER SCENARIO, so it has ONE
    // sample condition and one answer — which `roundGroups` establishes rather than this file
    // asserting it: if a row ever arrives here with a different `per`, the group split will show it
    // and its members will print their own figure or their own absence of one.
    const mountGroups = roundGroups(mountPhases, mountSeries, 'MOUNT');
    const mountGroup = groupOf(mountGroups, 'shipped', 'MOUNT');
    const mountMeasured = requireNull(mountGroup, 'MOUNT');
    const mountNull = mountMeasured.nulls;

    line('');
    line(`TABLE 1 — THE MOUNT. ms per ${ROWS}-row mount, ns per row, and the ratio to the floor.`);
    line('  row            ms/mount    ns/row   × native   what it is');
    const mountFloor = perMount('native');
    for (const p of mountPhases) {
        const ms = perMount(p.name);
        const ratio = p.name === 'native' ? '    1.00×' : `${(ms / mountFloor).toFixed(2)}×`;
        line(
            `  ${p.name.padEnd(13)}${f4(ms).padStart(9)}${ns(perRow(p.name)).padStart(10)}` +
                `${ratio.padStart(10)}   ${p.what}`
        );
    }
    line(
        `  resolution floor: ${f6(mountNull.resolution * 1e6)} ns per row ` +
            `(bias ${f6(mountNull.bias * 1e6)} ns, round-to-round noise ` +
            `${f6(
                mountNull.noise * 1e6
            )} ns) — a difference under this is not a size. ONE FIGURE ` +
            `COVERS THIS WHOLE TABLE and that is checked, not assumed: all ${mountGroups.length} ` +
            `sample condition(s) here are the same ${mountGroup.per} rows per scenario, so the ` +
            `pair \`${mountMeasured.pair[0]}\`/\`${mountMeasured.pair[1]}\` is sampled exactly as ` +
            'every row it is the null for is.'
    );
    line(
        '  THIS TABLE PUBLISHES NO PER-PACK FIGURE ANY MORE. It used to print what the walking ' +
            'reconciler and the keyed list cost at a first placement; both packs are deleted from ' +
            'the library, so the rows are struck rather than re-aimed at a surviving one. What is ' +
            'left is the shipped composition against the floor, which is what the tables below are ' +
            'read against.'
    );
    emitRecordedRows(
        'mount',
        'ns',
        'row',
        mountPhases.map((p) => [p.name, scaledStat(mountStat.get(p.name) as Stat, 1e6)] as const)
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLE 2 — THE REFETCH
    // ═══════════════════════════════════════════════════════════════════════════════════════

    const refetchPhases = updatePhases(TABLE2, batch);
    const refetchSeries = runPhases(refetchPhases, rounds);
    const refetchStat = new Map<string, Stat>();
    for (const p of refetchPhases) {
        refetchStat.set(p.name, stat(refetchSeries.get(p.name) as number[]));
    }
    const perRefetch = (name: string): number => (refetchStat.get(name) as Stat).median;

    // TWO ROUND-COUNT GROUPS ON THIS TABLE, AND THE NULL IS IN ONLY ONE OF THEM. `native·rebuild`,
    // `shipped` and `shipped·twin` run at UPDATE_ROUNDS; `store·bound` runs at STORE_ROUNDS and is
    // the only row there, so that group HAS NO PAIR and the table prints that rather than lending it
    // the other group's figure.
    const refetchGroups = roundGroups(refetchPhases, refetchSeries, 'REFETCH');
    const refetchShippedGroup = groupOf(refetchGroups, 'shipped', 'REFETCH');
    const refetchStoreGroup = groupOf(refetchGroups, 'store·bound', 'REFETCH');
    // THE REBUILD GROUP MUST HAVE ITS PAIR — a loud stop here, rather than a table that quietly
    // prints one fewer figure than its sentences promise.
    requireNull(refetchShippedGroup, 'REFETCH');

    line('');
    line(
        `TABLE 2 — THE REFETCH: the source is set to a freshly allocated array of ${ROWS} ` +
            'BRAND-NEW item objects carrying the same ids and the same labels, in the same order.'
    );
    line('  row              µs/round   × floor   rounds   fresh   what it is');
    const refetchFloor = perRefetch('native·rebuild');
    /** `fresh`/`STALE`, out of the untimed probe above — never a hand-written verdict. */
    const freshCell = (name: string): string => {
        const seen = REFETCH_FRESH.get(name);
        return seen === undefined ? '  ?  ' : seen ? 'fresh' : 'STALE';
    };
    for (const p of refetchPhases) {
        const ratio =
            p.name === 'native·rebuild'
                ? '    1.00×'
                : `${(perRefetch(p.name) / refetchFloor).toFixed(2)}×`;
        line(
            `  ${p.name.padEnd(15)}${us(perRefetch(p.name)).padStart(9)}${ratio.padStart(9)}` +
                `${String(p.per).padStart(9)}   ${freshCell(p.name).padEnd(8)}${p.what}`
        );
    }
    printGroupResolutions(
        refetchGroups,
        1e3,
        'µs',
        'round',
        (g) =>
            `Closing it needs a second, separately declared twin of ${g.members.join(
                ', '
            )} run at ` +
            "this table's STORE_ROUNDS — a participant nobody has asked for, and adding one would " +
            'change what these rows are sampled alongside. TABLE 3 has such a pair ' +
            '(`store·bound`/`store·bound·twin`) but at its own PARTIAL_ROUNDS, which is a third ' +
            'sample condition again and transfers to nothing here.'
    );
    line(
        '  AND THE `× floor` COLUMN CROSSES ROUND-COUNT GROUPS AS WELL AS JOBS. The floor ' +
            `(\`native·rebuild\`) is sampled at ${refetchShippedGroup.per} rounds per scenario and ` +
            `\`store·bound\` at ${refetchStoreGroup.per}, so that ratio is an ORDER OF MAGNITUDE ` +
            'and not a size: two different sample conditions, and no null in this run spans both.'
    );
    line('  TWO JOBS SHARE THIS `× floor` COLUMN, AND IT RANKS SPEED INSIDE A GROUP ONLY:');
    line(
        '    (a) TOLD NOTHING, SO REBUILD — `native·rebuild`, `shipped`, `shipped·twin`. One job, ' +
            'three programs; the ratios between THESE are ratios.'
    );
    line(
        '    (b) KEEPS ITS ELEMENTS AND STAYS FRESH — `store·bound`. A SMALLER JOB, and the reason ' +
            'it is smaller is NOT the reconciler: it runs the SHIPPED composition with no pack. It ' +
            'is smaller because the DATA LAYER preserved identity, so the reconciler was handed the ' +
            'objects it already held and had nothing to build; and it is fresh because the row holds ' +
            'its text through an effect over a per-entity source rather than stamping it in at ' +
            'build time. What it SKIPPED that the floor did: every clone, every insert and every ' +
            `removal. What it PAID that the floor did not: ${ROWS} Map lookups and ${ROWS} source ` +
            'writes, all on the clock.'
    );
    line(
        '  SO A `store·bound` FIGURE UNDER THE FLOOR IS NOT THE FLOOR BEATEN AT ITS OWN JOB — the ' +
            'jobs differ, and both are stated above so the ratio can be read rather than quoted. ' +
            'Read the sign together with the `fresh` column either way: these rows do not differ ' +
            'only in speed, they differ in whether the page is correct after a field changes.'
    );
    emitRecordedRows(
        'refetch',
        'µs',
        'round',
        refetchPhases.map(
            (p) => [p.name, scaledStat(refetchStat.get(p.name) as Stat, 1e3)] as const
        )
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLE 3 — THE PARTIAL UPDATE
    // ═══════════════════════════════════════════════════════════════════════════════════════

    const partialPhases = updatePhases(TABLE3, batch);
    const partialSeries = runPhases(partialPhases, rounds);
    const partialStat = new Map<string, Stat>();
    for (const p of partialPhases) {
        partialStat.set(p.name, stat(partialSeries.get(p.name) as number[]));
    }
    const perPartial = (name: string): number => (partialStat.get(name) as Stat).median;

    // TWO ROUND-COUNT GROUPS AND TWO NULLS, WHICH IS THE WHOLE REASON THIS TABLE CAN BE READ.
    // `shipped`/`shipped·twin` answer for the rebuild group; `store·bound`/`store·bound·twin` answer
    // for the FAST group, which is where this table's headline difference lives and where the other
    // group's figure — orders of magnitude larger — would have swallowed everything.
    const partialGroups = roundGroups(partialPhases, partialSeries, 'PARTIAL');
    const partialShippedGroup = groupOf(partialGroups, 'shipped', 'PARTIAL');
    requireNull(partialShippedGroup, 'PARTIAL');
    const partialFastGroup = groupOf(partialGroups, 'store·bound', 'PARTIAL');
    // THE FAST GROUP MUST HAVE ITS OWN PAIR OR THIS TABLE MAY NOT PUBLISH ITS HEADLINE. Checked
    // here, loudly: without `store·bound·twin` the only figure available for `store·bound` against
    // `native·find` is the other group's, which is orders of magnitude larger and would call the
    // result nothing however real it is.
    requireNull(partialFastGroup, 'PARTIAL');

    /**
     * HOW A PUBLISHED DIFFERENCE IS QUALIFIED — against its OWN group's null, or against the printed
     * fact that its group has none. Never against another group's figure.
     */
    const againstGroup = (g: TExoRoundGroup, scale: number, unit: string): string => {
        const m = g.measured;
        if (m === null) {
            return (
                `against NO RESOLUTION FIGURE AT ALL: this run holds no null pair at ${g.per} ` +
                `rounds per scenario (that group is ${g.members.join(
                    ', '
                )}), so nothing here says ` +
                "whether this number is a size or scatter, and the other groups' figures were " +
                'sampled under other conditions and may not be lent to it'
            );
        }
        return (
            `against ITS OWN GROUP'S resolution floor of ${f6(m.nulls.resolution * scale)} ` +
            `${unit} (sampled between \`${m.pair[0]}\` and \`${m.pair[1]}\`, at the same ${g.per} ` +
            'rounds per scenario)'
        );
    };

    line('');
    line(
        'TABLE 3 — THE PARTIAL UPDATE: the array is identical in length, membership and order, ' +
            `and ONE FIELD OF ROW ${PARTIAL_AT} takes a new value. Nothing else changes. This is the ` +
            'commonest thing an application does to a list.'
    );
    // THE NAME COLUMN IS TWO WIDER THAN THE OTHER TABLES', because `store·bound·twin` is two
    // characters longer than the widest name any other table carries and a row that overflows its
    // column pushes every figure on that line out of alignment with the ones above it.
    line('  row                µs/round   × find   rounds   outcome   what the route does');
    const partialFloor = perPartial('native·find');
    for (const p of partialPhases) {
        const ratio =
            p.name === 'native·find'
                ? '   1.00×'
                : `${(perPartial(p.name) / partialFloor).toFixed(2)}×`;
        const outcome = PARTIAL_OUTCOME.get(p.name) ?? '  ?  ';
        line(
            `  ${p.name.padEnd(17)}${us(perPartial(p.name)).padStart(9)}${ratio.padStart(8)}` +
                `${String(p.per).padStart(9)}   ${outcome.padEnd(10)}${p.what}`
        );
    }
    printGroupResolutions(
        partialGroups,
        1e3,
        'µs',
        'round',
        (g) =>
            `\`${g.members.join(', ')}\` is the whole of this group and has no twin in this run, ` +
            'so no difference involving it is qualified by anything and none is published above.'
    );
    line(
        `  THE \`× find\` COLUMN CROSSES ROUND-COUNT GROUPS FOR EVERY ROW OUTSIDE THE ` +
            `${partialFastGroup.per}-ROUND GROUP. \`native·find\` is sampled at ` +
            `${partialFastGroup.per} rounds per scenario and \`shipped\`/\`shipped·twin\` at ` +
            `${partialShippedGroup.per}. Those ratios keep their ORDER OF MAGNITUDE and lose the ` +
            'right to be quoted as differences — no null in this run spans two groups, and one that ' +
            'did would be a null for neither. The three ratios INSIDE the fast group (`native·held` ' +
            'and both `store·bound` rows against `native·find`) are the only ones on this line that ' +
            'are same-sample.'
    );
    line(
        '  THE JOB THIS TABLE MEASURES: make row ' +
            `${PARTIAL_AT}'s label read the new value, and leave the other ${
                ROWS - 1
            } rows alone. ` +
            'THAT IS NOT THE JOB TABLE 2 MEASURES, and the two `× floor` columns may never be ' +
            'compared: TABLE 2 replaces every record, this one replaces one field, and a strategy ' +
            'that keeps its elements is flattered by the first and tested by the second.'
    );
    line(
        '  THE FLOOR HERE IS NOT `native·rebuild` AND THAT ROW IS ABSENT ON PURPOSE. Rebuilding ' +
            `${ROWS} rows to change one character is an absurd program to measure against — it ` +
            'would make every row on this table look excellent. `native·find` locates the row and ' +
            'writes the text; `native·held` kept the Text node at mount and stores one `.data`. ' +
            'The second floor exists so that a row landing UNDER `native·find` is read correctly: ' +
            "a bound port's subscriber HOLDS the node it resolved, so it skips the lookup the " +
            'first floor performs — that is a smaller job, not a faster program.'
    );
    line('  WHAT EACH GROUP COULD SAY, which is what the µs column is actually measuring:');
    line(
        '    `store·bound` SAID "THIS FIELD CHANGED" — one Map lookup, one source write, one bound ' +
            'port. The LIST SOURCE IS NEVER NOTIFIED, because the array did not change, so no ' +
            'reconciler runs at all. It is the only participant here whose cost does not grow with ' +
            `${ROWS}. \`store·bound·twin\` SAYS THE SAME THING BY THE SAME ROUTE and is not a ` +
            'strategy: it is that sentence written out a second time, so that the difference ' +
            'between the two is what this group cannot tell apart from nothing.'
    );
    line(
        '    `shipped` / `shipped·twin` COULD ONLY HAND THE ARRAY OVER — a fresh array of ' +
            `${ROWS - 1} of the same objects and one new one, because their source carries whole ` +
            'arrays and nothing else. The reconciler then works out what moved: ' +
            `${ROWS} pointer compares, one identity miss, one row rebuilt.`
    );
    const storeVsFind = perPartial('store·bound') - perPartial('native·find');
    line(
        `  \`store·bound\` AGAINST THE LOOKUP FLOOR (\`native·find\`) — THIS TABLE'S HEADLINE: ` +
            `${us(storeVsFind)} µs per round, ${againstGroup(partialFastGroup, 1e3, 'µs')}. ` +
            'SAME-SAMPLE: both rows run at the same round count, and the null this is read against ' +
            'was sampled between two rows of the same group at that same count. A NEGATIVE FIGURE ' +
            "IS NOT THE FLOOR BEATEN AT ITS OWN JOB: the bound port's subscriber holds the Text " +
            'node it resolved, so it skips the lookup the floor performs — a smaller job, stated so ' +
            'the sign can be read.'
    );
    const storePartial = perPartial('store·bound') - perPartial('native·held');
    line(
        `  \`store·bound\` AGAINST THE LOWER-BOUND FLOOR (\`native·held\`): ${us(
            storePartial
        )} µs ` +
            `per round, ${againstGroup(partialFastGroup, 1e3, 'µs')}. SAME-SAMPLE, for the same ` +
            'reason as the line above. Both write one text value; what the store row carries on top ' +
            'is the Map lookup, the source write, the subscriber call and the `getValue()` re-read ' +
            '— and what it buys for them is that an application never has to know where the node is.'
    );
    emitRecordedRows(
        'partial',
        'µs',
        'round',
        partialPhases.map(
            (p) => [p.name, scaledStat(partialStat.get(p.name) as Stat, 1e3)] as const
        )
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLE 4 — THE TEXT WRITE
    // ═══════════════════════════════════════════════════════════════════════════════════════

    const writePhases = updatePhases(TABLE4, batch);
    const writeSeries = runPhases(writePhases, rounds);
    const writeStat = new Map<string, Stat>();
    for (const p of writePhases) writeStat.set(p.name, stat(writeSeries.get(p.name) as number[]));
    const perWrite = (name: string): number => (writeStat.get(name) as Stat).median;

    // ONE ROUND-COUNT GROUP — every row here fills the same WRITE_PORTS ports the same number of
    // times — so one figure covers this table, and the split establishes that rather than this file
    // asserting it.
    const writeGroups = roundGroups(writePhases, writeSeries, 'WRITE');
    const writeGroup = groupOf(writeGroups, 'bare', 'WRITE');
    const writeNull = requireNull(writeGroup, 'WRITE').nulls;

    line('');
    line(
        `TABLE 4 — THE TEXT WRITE: one instance, ${WRITE_PORTS} text ports, every one of them ` +
            'filled through the fill doors the wire handed back. The two packs this axis exists to ' +
            'price, with the shipped writer beside them as the control.'
    );
    line('  row              µs/round   rounds   translator   what it composes and what it writes');
    for (const p of writePhases) {
        const outcome = TEXT_OUTCOME.get(p.name) ?? '  ?  ';
        line(
            `  ${p.name.padEnd(15)}${us(perWrite(p.name)).padStart(9)}${String(p.per).padStart(
                9
            )}` + `   ${outcome.padEnd(13)}${p.what}`
        );
    }
    line(
        `  resolution floor: ${f6(writeNull.resolution * 1e3)} µs per round ` +
            `(bias ${f6(writeNull.bias * 1e3)} µs, round-to-round noise ` +
            `${f6(writeNull.noise * 1e3)} µs) — ONE FIGURE COVERS THIS WHOLE TABLE, checked and ` +
            `not assumed: every row here is sampled at the same ${writeGroup.per} rounds per ` +
            `scenario, the null included, and that null is \`bare\` against a SECOND bare backend. ` +
            'A difference between two rows under this is not a size.'
    );
    line(
        '  NO RATIO AND NO DERIVED DIFFERENCE IS PRINTED, AND THAT IS A DECISION THIS RUN RECORDS ' +
            'RATHER THAN AN OMISSION. Neither pack had ever been measured before this table ' +
            'existed, and the two sides are not ordered on paper: the reclaiming writer runs a ' +
            'longer body per fill AND compiles a different schema, because declaring nothing makes ' +
            "the port's slot hold the ELEMENT where the shipped writer's holds the Text node. So " +
            'what is published is the absolutes above, the resolution beside them, and the ' +
            'translator column — and whoever reads a difference out of them does so against that ' +
            'floor, in the open.'
    );
    line(
        '  WHAT THE `translator` COLUMN IS: the untimed OUTCOME 2 probe above, read out of the live ' +
            'DOM after another program replaced every Text node in the instance. `native·store` and ' +
            '`bare` both kept a node they had resolved and therefore write where nobody is looking; ' +
            'the two pack rows were handed the element and can still find out what is in there. ' +
            'THAT IS THE CAPABILITY THE PACK IS FOR, and it is not weighed against the µs column ' +
            'here: the timed rounds all write into an untouched page, which is the page an ' +
            'application has almost all of the time.'
    );
    line(
        '  AND `defaults` AGAINST `reclaiming` IS NOT A SECOND STRATEGY. `withExoDefaults` is one ' +
            'line calling `withExoReclaimingText`, so the two rows install the same writer body ' +
            'through two separately composed backends and two separately compiled schemas. Both are ' +
            'printed because the gate discovers packs by EXPORT, and a bundle that grows a second ' +
            'pack must not quietly go unpriced behind the pack it already holds.'
    );
    emitRecordedRows(
        'text-write',
        'µs',
        'round',
        writePhases.map((p) => [p.name, scaledStat(writeStat.get(p.name) as Stat, 1e3)] as const)
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // THE REFUSALS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    //
    // STRUCK: the three LADDER refusals this file carried all named deleted rows. TABLE 1's demanded
    // that `walk`, `keyed` and `keyed·walk` not measure cheaper than `shipped` at a first placement;
    // the DRIFT table's demanded the same of `walk` on a notification; the partial table's demanded
    // it of `shipped·all` and `walk`. Every one of those rows priced a pack that no longer exists.
    //
    // NOTHING OF THE SORT IS ASSERTED FOR TABLE 4 IN EITHER DIRECTION, and that is deliberate: a
    // ladder refusal is a claim about which of two programs must be dearer, and this run has no
    // basis for one between the shipped writer and the reclaiming one. The group's own null is
    // printed instead, and a reader can see what the instrument could not tell apart.

    // ── EVERY PUBLISHED DIFFERENCE AGAINST ITS OWN GROUP'S NULL, AND EACH IN ITS OWN UNIT.
    //
    // A NULL BELONGS TO A ROUND-COUNT GROUP, not to a table and not to a file. Across tables the
    // reason is obvious — a per-ROW difference checked against a per-ROUND floor is a warning that
    // means nothing — but the same is true INSIDE a table whose rows are sampled at different round
    // counts, and that one is not obvious at all.
    //
    // A WARNING AND NOT A REFUSAL: every answer paragraph above already prints its own difference
    // beside its own floor, so a reader can see which figure is a size and which is only an
    // ordering. This line is what stops that having to be worked out by hand.
    const claims: readonly (readonly [string, number, TExoRoundGroup])[] = [
        [
            'the slot store against the lookup floor on one field, per round',
            storeVsFind,
            partialFastGroup,
        ],
        [
            'the slot store against the held-node floor on one field, per round',
            storePartial,
            partialFastGroup,
        ],
    ];
    for (const [what, diff, group] of claims) {
        const size = Math.abs(diff);
        if (size === 0) continue;
        const m = group.measured;
        if (m === null) {
            line(
                `⚠ plugin-price: ${what} is ${f6(size * 1e6)} ns and ITS OWN GROUP — the rows ` +
                    `sampled at ${group.per} units per scenario (${group.members.join(', ')}) — ` +
                    'HAS NO NULL PAIR IN THIS RUN. Nothing here says whether that figure is a ' +
                    "size, and no other group's null answers for it: they were sampled under " +
                    'other conditions. Declare a twin inside that group, or stop publishing the ' +
                    'figure.'
            );
            continue;
        }
        if (m.nulls.resolution <= size * 0.25) continue;
        line(
            `⚠ plugin-price: ${what} is ${f6(size * 1e6)} ns and its own group's null ` +
                `(\`${m.pair[0]}\`/\`${m.pair[1]}\`, at ${group.per} units per scenario) ` +
                `resolved ${f6(m.nulls.resolution * 1e6)} ns — that figure is an ORDERING and ` +
                'not a size. Raise `rounds`, or raise the batch.'
        );
    }

    // ── THE CLOCK, PER REGION, ON ALL FOUR TABLES.
    const clockFloor = MIN_TICKS * quantum;
    const checkClock = (
        phases: readonly Phase[],
        perUnit: (name: string) => number,
        table: string
    ): void => {
        for (const p of phases) {
            const region = regionOf(p, perUnit(p.name));
            if (region >= clockFloor) continue;
            const factor = region > 0 ? clockFloor / region : Infinity;
            const wantBatch = Number.isFinite(factor)
                ? Math.ceil(Math.max(1, batch) * factor)
                : Math.max(1, batch) * 10;
            refuse(
                `plugin-price: the "${p.name}" ${table} region is ${region.toFixed(3)} ms at ` +
                    `${p.reps}×${p.per} — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                    `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                    `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                    `\`node scripts/run-one-axis.js plugin-price ${rounds} ${wantBatch}\``
            );
        }
    };
    checkClock(mountPhases, perRow, 'MOUNT');
    checkClock(refetchPhases, perRefetch, 'REFETCH');
    checkClock(partialPhases, perPartial, 'PARTIAL');
    checkClock(writePhases, perWrite, 'WRITE');

    // ── AND WHAT NO NUMBER ON THIS PAGE COVERS.
    line('');
    line(`sink: ${sink} observed — nothing above was folded away`);
    line(
        'WHAT THIS RUN DID NOT MEASURE ABOUT THE TWO TEXT PACKS, first, because they are the newest ' +
            'rows and the easiest to over-read: THEIR MOUNT IS ON NO TABLE. A text port under the ' +
            "reclaiming writer takes ONE slot where the shipped writer's takes two (the Text node " +
            'is a second landing), so the two compositions compile DIFFERENT SCHEMAS and build ' +
            'different instance tables, and TABLE 1 holds no row for either — its subject is a ' +
            'list. So the build-time half of the trade is unmeasured, it is real, and nothing on ' +
            'these tables may be read as covering it. Also unmeasured for them: a BOUND text port, ' +
            'which recovers under every composition through a different route entirely ' +
            '(`dom/text-binding.test.ts`); the EMPTY write, whose arm takes the Text node out and ' +
            'which no round here takes; a page where the translator struck only SOME ports, so the ' +
            "writer's test fails on some fills and passes on others; `markupCarries` and therefore " +
            'HYDRATION under either pack; and the SERVER and the TERMINAL, which have writers of ' +
            'their own that these two packs do not reach.'
    );
    line(
        'AND WHAT THIS RUN DID NOT MEASURE ABOUT THE SLOT STORE: ITS MOUNT IS ALSO ON NO TABLE. ' +
            `\`store·bound\` takes ${ROWS} more subscriptions than any other participant (one ` +
            '`onChange` and one closure per row) and stands a store up beside them, and TABLE 1 ' +
            'cannot host it — the mount table times the render itself, a shell reads its store out ' +
            "of a module variable AT RENDER TIME, and `sampleOnce` runs every scenario's `prep` " +
            'before any `measure`, so no per-rep `prep` can install a per-rep store. Sharing one ' +
            'store across the reps would promote every field source off its single-subscriber path ' +
            'and measure a different program. Also unmeasured for that row: MEMORY (it holds ' +
            `${ROWS} sources and a Map for the life of the list); a refetch that INSERTS or DELETES ` +
            'an id, which this store refuses by name rather than answering; a store shared by two ' +
            "lists, which is the promoted-subscriber path; and any real store — `@oimdb`'s queue, " +
            'compute runtime and derived indexes are a different and larger cost that this row ' +
            'deliberately does not carry, so no number here transfers to it.'
    );
    line(
        'AND WHAT THIS AXIS NO LONGER MEASURES AT ALL, because the library deleted it: the walking ' +
            'children reconciler, the keyed list, the binding pack, the two reconcilers stacked, ' +
            'and the op channel. Those five rows are struck and not re-aimed — there is no ' +
            '`children` field on a backend, no `attachExoKeyedList` and no `attachExoList` — so ' +
            'the DRIFT scene (a region another program mutated) has no participant in this ' +
            'repository and is UNMEASURED rather than answered. Nothing above is a figure for any ' +
            'of them.'
    );
    line(
        'AND, FOR EVERY TABLE ABOVE: layout, style and paint. Every region ends at the last DOM ' +
            'mutation, before the browser does anything with it.'
    );
}
