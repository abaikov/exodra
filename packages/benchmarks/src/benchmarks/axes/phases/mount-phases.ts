// DIAGNOSTIC — WHAT FRACTION OF A MOUNT IS THE PER-INSTANCE WALK REPLAY?
//
// It answers ONE question, about ONE renderer, on the app the mount axis already measures (the
// 80-card todo app in `apps/exodra/exodra.tsx`). It is not a framework comparison and it is not
// part of `npm run bench`; it is registered as an axis only so it can reuse the runner that already
// starts Vite, drives headless Chromium and forwards the browser's console.
//
// ── WHY THE QUESTION IS BEING ASKED ─────────────────────────────────────────────────────────
//
// Mikado mounts this app slightly faster than the schema core (medians 0.380 vs 0.400 ms), and
// the mechanism is visible in its source: it FILLS the factory and then clones it, so the path
// to each hole is resolved once, on the factory, and never per instance. The schema core does
// the opposite — it clones first (`mountExoInstance.ts`) and then replays a walk over the
// fresh clone (`wire-exo-instance.ts`, the `for` over `schema.walk`) — because a fill has to land
// on THIS instance's nodes.
//
// There is a design that would narrow that: let a port declare itself CONSTANT for the life of
// an instance, write its value into the prototype before the clone, and drop the elements it
// reaches out of the walk. It splits a wiring function into two phases and therefore changes the
// component contract, which is a large price. It is worth proposing only if the walk is a
// meaningful share of a mount — and this file exists to produce that share as a number instead
// of an argument.
//
// ── WHAT IS MEASURED ────────────────────────────────────────────────────────────────────────
//
// Five phases, every one of them normalised to MS PER MOUNT OF THE WHOLE 80-CARD APP, all
// interleaved in one run with the order rotated per round and a GC before every sample:
//
//   clone          321 `schema.proto.cloneNode(true)` calls — one per instance the app mounts,
//                  in mount order, and nothing else.
//   clone+walk     the same, plus the replay loop copied verbatim out of `wireExoInstance`.
//   clone+walk+ins the same, plus every insertion the mount performs, into the same parents,
//                  in front of the same anchors, in the same order.
//   mount          `mountExodraApp` — the real thing, the axis's own timed region.
//   walk           the replay loop ALONE, over one app's census of clones made before the timer
//                  started. No subtraction is involved in this one.
//
// THE RUN OPENS WITH A CENSUS — instances, slots and walk triples per component, read off the
// compiled schemas (`schema.walk.length / 3`) and not measured — because "the walk costs X ms"
// only becomes arguable as "X ms for N hops". Reading the schema compiler, the expectation for
// this app is CARD 7 hops and TAG 1, with APP and DETAILS contributing none, which is
// 7 × 80 + 1 × 200 = 760 hops for the whole 321-instance mount. If the run prints something else,
// the code moved and that reading is stale — the printed numbers are the schemas' own.
//
// WHERE THE SEVEN COME FROM, because the arithmetic is the only part of this header a reader
// cannot check against the run. The emit pass allocates a slot and a hop for EVERY element child
// in document order, and a text port then appends ONE more `firstChild` hop to reach its Text node
// (READ FROM CODE: `packages/dom/src/dom/compileExoDomSchema.ts`, the `while (i < kids.length)`
// loop and the `wantsTextNode` branch). The card's children are h3 → button.tog → the details
// children port, which emits nothing → div.tags → span.count → button.addtag, so that is FIVE
// element hops (one `firstChild` to the `<h3>`, then four `nextSibling` steps), plus TWO text-port
// hops — into the `<h3>`'s headline and into the `.count` span's label. Attribute and event ports
// add none: they are written on an element the walk already resolved, which is why the card's
// `aria-expanded` port is free here and its `.count` element is not.
//
// IT WAS 5 HOPS AND 600 BEFORE THE APP'S THREE DERIVED VALUES EXISTED, when the card was five
// elements with one text port. The two hops that arrived are the `.count` span and its Text node,
// and the extra 160 per mount is 80 cards × 2 — which is also why the ratio this axis reports may
// move without the walk loop having changed at all.
//
// So there are TWO independent estimates of the same quantity, and the run prints both:
//
//   LADDER      (clone+walk) − (clone)   — the walk with its cache-warming effect INCLUDED, and
//                                          with whatever noise two ~2 ms medians differ by.
//   ISOLATED    walk                     — the walk over nodes that are already resident, which
//                                          is the friendliest case the loop can be given.
//
// The truth is between them. If they disagree wildly, the number is not usable and the run says
// so; if they agree and are small, the proposal above is dead and no more time should go into it.
//
// ── WHAT THIS MEASUREMENT CANNOT SEPARATE, and the ways it could mislead ────────────────────
//
// 1. THE WALK WARMS EXACTLY THE NODES THE SETTERS THEN WRITE. This is the single most likely
//    way the number misleads, and no arrangement of these phases can fix it. Every hop pulls an
//    element into cache one instant before `c.attr(...)` writes to that same element. Take the
//    walk away and the setters pay a cold miss the walk used to absorb, so the mount does not
//    get faster by the walk's whole cost — some of it MOVES. `LADDER` includes the warming (the
//    stage that does the walk also does no writes afterwards, so it gets no credit for it, which
//    is why it reads high); `ISOLATED` re-walks nodes that are already resident, which is why it
//    reads low. Neither is the counterfactual "a mount with no walk in it" — that program does
//    not exist yet, and building it is the very decision this number is for.
//
// 2. THE REPLICA IS NOT THE RENDERER. `clone`, `clone+walk` and `clone+walk+ins` reproduce the
//    clones, the hops and the insertions of a mount and NOTHING else: no connector push/pop, no
//    region anchor resolution, no `regions` array, no held-attribute sweep, no teardown scope, no
//    subscription, no handler closures, no list registry. All of that lands in the residual the run
//    labels `wire + plumbing`, which is therefore a bucket and not a measurement of `cb()`. It is
//    named that way on purpose: reading it as "the cost of the wiring call" would overstate the
//    call and understate the plumbing around it.
//
// 3. THE REPLAY IS CALLED, NOT INLINED, in the replica (`replay(schema, root, nodes)`), where the
//    renderer has those six lines inline inside `wireExoInstance`. V8 will very likely inline a
//    function this small at a monomorphic call site; if it does not, the walk's number carries
//    321 extra calls per mount and is an UPPER bound — which is the safe direction for a
//    conclusion of "too small to be worth a contract change".
//
// 4. THE ISOLATED PHASE RE-WALKS THE SAME CLONES. It rotates over 8 independently cloned sets
//    (8 × 321 instances) so that one set cannot sit entirely in the nearest cache for a whole
//    sample, and the clones are detached — a mount's clones are detached while they are walked
//    too. That is a mitigation of (1), not a cure: these nodes were created before the sample
//    and are walked hundreds of times, where a mount walks each clone once, microseconds after
//    creating it.
//
// 5. THE PHASES DO NOT ALL USE THE SAME REPETITION FACTOR. One app's worth of walk is ~760 hops,
//    which is far under Chromium's 100 µs clock, so the isolated phase repeats 400 times inside
//    one timed region where the ladder repeats 20. Repetition count is part of a measurement's
//    conditions (allocation rate, GC pressure, how warm the caches get), so the two are not
//    perfectly comparable even though both are printed as ms per mount. This is exactly why the
//    ladder estimate exists beside the isolated one rather than instead of it.
//
// 6. `startsOpen(i)` AND `startCount(i)` ARE CALLED IN EVERY REPLICA STAGE, because the card's
//    wire calls them too. They are identical across the three replica stages, so every SUBTRACTION
//    between them is unaffected; only the absolute `clone` figure carries them.
//
// ── HOW THIS FILE MEASURES, AND WHY NOT THROUGH `abBench` ───────────────────────────────────
//
// `abBench` is where every curated axis measures, and this is deliberately not one of them. Two
// things it cannot do here: its `batch` is one number for the whole run, and this run needs a
// repetition factor PER PHASE (point 5 above); and it prints its medians rather than returning
// them, where the whole output of this diagnostic is a RATIO — printing four tables and asking
// the reader to do the division is precisely where a number like this gets misread. What it does
// keep from `abBench` is everything that makes a number trustworthy: interleaving with the order
// rotated per round, a GC before every sample, and the full min/p25/median/p75/max spread rather
// than a mean.
//
//     npm run axis --workspace=@exodra/benchmarks -- mount-phases
//
// `@exodra/dom` is resolved to its BUILT dist, exactly as the axes are, so `npm run build` at the
// repo root has to have run or this attributes a stale renderer.
import {
    exoDomSchemaOf,
    EXO_WALK_FIRST_CHILD,
    ExoDomBackend,
    type TExoDomSchema,
} from '@exodra/dom';
import {
    APP,
    CARD,
    CARD_PORTS,
    DECK,
    DECK_PORTS,
    DETAILS,
    TAG,
    mountExodraApp,
} from '../../participants/exodra/app';
import { IDX, el, startsOpen, startCount, type AppHandle } from '../../shared/todo-spec';
import { DECK_IDX, cardsOfDeck } from '../../apps/scene/spec';
import type { Scenario } from '../../../harness';

const EXO_BACKEND = new ExoDomBackend();

// ---------------------------------------------------------------------------------------
// THE SCHEMAS. The SAME objects a mount uses: `exoDomSchemaOf` caches on `machine.forms`
// and a render keys the cache on the same `EXO_BACKEND`'s `backendType`, so whichever of the two
// runs first, the other finds this schema.
// ---------------------------------------------------------------------------------------

const APP_PLAN = exoDomSchemaOf(APP, EXO_BACKEND);
const DECK_PLAN = exoDomSchemaOf(DECK, EXO_BACKEND);
const CARD_PLAN = exoDomSchemaOf(CARD, EXO_BACKEND);
const DETAILS_PLAN = exoDomSchemaOf(DETAILS, EXO_BACKEND);
const TAG_PLAN = exoDomSchemaOf(TAG, EXO_BACKEND);

/** The slot holding `div.cards` — where a deck's cards are inserted. */
const DECK_CARDS_SLOT = DECK_PLAN.elem[DECK_PORTS.cards.index];
/** The slot holding `div.tags` — where a card's tag rows are inserted. */
const CARD_TAGS_SLOT = CARD_PLAN.elem[CARD_PORTS.tags.index];
/** The slot holding the element the details region lives IN — the card root. */
const CARD_DETAILS_ELEM = CARD_PLAN.elem[CARD_PORTS.details.index];
/** The slot of the static element the details region must be inserted BEFORE (`div.tags`),
 *  or `-1` if the region runs to the end of its parent. */
const CARD_DETAILS_END = CARD_PLAN.childListEndSlot[CARD_PORTS.details.index];

// ---------------------------------------------------------------------------------------
// THE CENSUS — how many instances of each component ONE mount builds, derived from the app's
// own spec rather than written down, so it cannot drift from the app.
// ---------------------------------------------------------------------------------------

const DECK_N = DECK_IDX.length;
const CARD_N = IDX.length;
const DETAILS_N = IDX.reduce((s, i) => s + (startsOpen(i) ? 1 : 0), 0);
const TAG_N = IDX.reduce((s, i) => s + startCount(i), 0);
const INSTANCES = 1 + DECK_N + CARD_N + DETAILS_N + TAG_N;

/**
 * ONE NODE ARRAY PER SCHEMA, built the way `TExoDomNode`'s constructor builds `nodes`:
 * pushed rather than left holey, and prefilled with the prototype so the array leaves this
 * function with its final element kind and length. A connector is per SCHEMA and reused by every
 * instance of that schema, so one array per schema is what the renderer actually has — not one per
 * instance.
 */
function nodesFor(schema: TExoDomSchema): Node[] {
    const nodes: Node[] = [];
    for (let i = 0; i < schema.slots; i++) nodes.push(schema.proto);
    return nodes;
}

const APP_NODES = nodesFor(APP_PLAN);
const DECK_NODES = nodesFor(DECK_PLAN);
const CARD_NODES = nodesFor(CARD_PLAN);
const DETAILS_NODES = nodesFor(DETAILS_PLAN);
const TAG_NODES = nodesFor(TAG_PLAN);

/**
 * THE THING BEING PRICED, copied VERBATIM out of `wire-exo-instance.ts`.
 *
 * If that loop ever changes and this copy does not, this diagnostic stops measuring the renderer
 * and says nothing about it, and there is no answer to that beyond stating it: there is no way to
 * reach the loop without also running the wire.
 *
 * THAT HAZARD HAS COST AN AXIS ONCE. `props-vs-ports` carried a second copy of this same replay,
 * inside an `openOne` that duplicated `wireExoInstance`'s per-instance work so a parent could fill
 * a nested child through its ports. When the per-instance context moved off the pooled connector
 * onto the instance's own record the copy went stale, and the axis was struck rather than repaired
 * — there was no way to rebuild it out of what `@exodra/dom` exports that did not give one
 * participant a record the other lacks. This file's copy is one loop rather than a mechanism, and
 * it is what this axis exists to price, which is why the same hazard is worth carrying here.
 */
function replay(schema: TExoDomSchema, root: Element, nodes: Node[]): void {
    nodes[0] = root;
    const walk = schema.walk;
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === EXO_WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
}

// ---------------------------------------------------------------------------------------
// THE LADDER. Three functions rather than one with flags: a branch per instance that the
// renderer does not have would be measured as if it were part of the phase, and V8 optimises a
// straight-line loop differently from one carrying a mode.
//
// EVERY STAGE KEEPS ITS CLONES ALIVE FOR THE WHOLE TIMED REGION, and that is not tidiness — it
// is the only way the phases share a GC regime. A timed region runs N repetitions before it
// stops, and the `mount` phase holds all N apps in N containers until its untimed cleanup; a
// replica stage that dropped each repetition's clones on the floor would be allocating into a
// nursery that recycles instead of into a growing live set, and would read cheaper than the same
// clones cost inside a mount. So each repetition is handed its OWN sink, allocated in the untimed
// `prep`, and every clone it makes is reachable until the sample ends.
// ---------------------------------------------------------------------------------------

/** One repetition's worth of clones — `INSTANCES` slots, packed, allocated untimed. */
function makeSink(): Element[] {
    return new Array<Element>(INSTANCES).fill(APP_PLAN.proto);
}

/** STAGE 1 — the clones and nothing else, in mount order. */
function stageClone(sink: Element[]): void {
    sink[0] = APP_PLAN.proto.cloneNode(true) as Element;
    let at = 1;
    for (let d = 0; d < DECK_N; d++) {
        sink[at++] = DECK_PLAN.proto.cloneNode(true) as Element;
        const cards = cardsOfDeck(d);
        for (let k = 0; k < cards.length; k++) {
            const i = cards[k];
            sink[at++] = CARD_PLAN.proto.cloneNode(true) as Element;
            if (startsOpen(i)) sink[at++] = DETAILS_PLAN.proto.cloneNode(true) as Element;
            const n = startCount(i);
            for (let t = 0; t < n; t++) sink[at++] = TAG_PLAN.proto.cloneNode(true) as Element;
        }
    }
}

/** STAGE 2 — the same clones, each followed by its own walk, exactly as a mount orders them. */
function stageCloneWalk(sink: Element[]): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    replay(APP_PLAN, appRoot, APP_NODES);
    sink[0] = appRoot;
    let at = 1;
    for (let deck = 0; deck < DECK_N; deck++) {
        const deckRoot = DECK_PLAN.proto.cloneNode(true) as Element;
        replay(DECK_PLAN, deckRoot, DECK_NODES);
        sink[at++] = deckRoot;
        const cards = cardsOfDeck(deck);
        for (let k = 0; k < cards.length; k++) {
            const i = cards[k];
            const cardRoot = CARD_PLAN.proto.cloneNode(true) as Element;
            replay(CARD_PLAN, cardRoot, CARD_NODES);
            sink[at++] = cardRoot;
            if (startsOpen(i)) {
                const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
                replay(DETAILS_PLAN, d, DETAILS_NODES);
                sink[at++] = d;
            }
            const n = startCount(i);
            for (let t = 0; t < n; t++) {
                const tag = TAG_PLAN.proto.cloneNode(true) as Element;
                replay(TAG_PLAN, tag, TAG_NODES);
                sink[at++] = tag;
            }
        }
    }
}

/**
 * STAGE 3 — clone, walk, and every insertion the mount performs.
 *
 * THE ORDER AND THE ANCHORS ARE THE MOUNT'S, not a convenient approximation. A card's details
 * block and its tags are inserted while the card is still detached (they are built by the card's
 * wire, and `mountExoInstance` inserts LAST), the card then goes into the app root, and the app
 * root goes into the container at the very end — so the whole tree is assembled detached and
 * attached in one final insertion, which is what the renderer does. The details block is
 * `insertBefore` its region's end (`div.tags`) and everything else is an append: 40 of this
 * app's 321 insertions have a non-null anchor, which is the split `mountExoInstance.ts`
 * measured and branches for.
 *
 * WHERE THE ANCHOR COMES FROM IS THE SCHEMA'S TABLE, read through this instance's walked nodes —
 * the same two array loads `TExoDomNode` does. It is NOT a `querySelector`, which would be
 * a different program and a far more expensive one.
 *
 * IT STILL WRITES ITS SINK, even though the tree it builds already keeps every clone alive. The
 * ladder is only readable by SUBTRACTION, so the two stages below it must differ from this one by
 * the insertions and by nothing else — 321 array stores dropped here would be quietly subtracted
 * from the insertion figure.
 */
function stageCloneWalkInsert(sink: Element[], container: Element): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    replay(APP_PLAN, appRoot, APP_NODES);
    sink[0] = appRoot;
    let at = 1;
    for (let deck = 0; deck < DECK_N; deck++) {
        const deckRoot = DECK_PLAN.proto.cloneNode(true) as Element;
        replay(DECK_PLAN, deckRoot, DECK_NODES);
        sink[at++] = deckRoot;
        // Read BEFORE the cards are walked: `DECK_NODES` is one array per schema, so a card's walk
        // does not touch it, but a nested DECK would — and this is the line that would have to
        // change if one ever nested.
        const cardsDiv = DECK_NODES[DECK_CARDS_SLOT] as Element;
        const cards = cardsOfDeck(deck);
        for (let k = 0; k < cards.length; k++) {
            const i = cards[k];
            const cardRoot = CARD_PLAN.proto.cloneNode(true) as Element;
            replay(CARD_PLAN, cardRoot, CARD_NODES);
            sink[at++] = cardRoot;
            const tagsDiv = CARD_NODES[CARD_TAGS_SLOT] as Element;
            if (startsOpen(i)) {
                const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
                replay(DETAILS_PLAN, d, DETAILS_NODES);
                sink[at++] = d;
                const into = CARD_NODES[CARD_DETAILS_ELEM] as Element;
                if (CARD_DETAILS_END >= 0) into.insertBefore(d, CARD_NODES[CARD_DETAILS_END]);
                else into.appendChild(d);
            }
            const n = startCount(i);
            for (let t = 0; t < n; t++) {
                const tag = TAG_PLAN.proto.cloneNode(true) as Element;
                replay(TAG_PLAN, tag, TAG_NODES);
                sink[at++] = tag;
                tagsDiv.appendChild(tag);
            }
            cardsDiv.appendChild(cardRoot);
        }
        appRoot.appendChild(deckRoot);
    }
    container.appendChild(appRoot);
}

// ---------------------------------------------------------------------------------------
// THE ISOLATED WALK. Instances CLONED before the timer started — one app's census of them, in
// mount order — walked with the same per-schema node arrays the renderer reuses.
//
// THEY ARE FRESH CLONES AND NOT A MOUNTED TREE, and that is a correctness requirement rather
// than a convenience. `schema.walk` is compiled for a clone, where a children port contributes NO
// nodes; on a MOUNTED card the details block and the tag rows stand in those gaps, so a
// `nextSibling` hop meant for the static after a region lands on a row instead (this is the whole
// reason `schema.hydrateWalk` exists). The hop COUNT would be the same and so, near enough, would
// the time — but the loop would be resolving a tree it was not compiled for, and a diagnostic
// that has to explain why its subject is wrong is one edit away from being wrong itself.
//
// NOTHING READS WHAT THE LOOP WRITES, which is the one shape in which a benchmark measures zero.
// It does not happen here: the node arrays are module-level bindings and therefore escape, and
// every hop goes through `firstChild`/`nextSibling`, which are Blink accessors and not something
// an optimiser may fold away. The `gateReplay` check below also proves the loop resolved real
// nodes at least once.
// ---------------------------------------------------------------------------------------

/** How many independently cloned sets the isolated phase rotates over. See caveat (4). */
const WALK_SETS = 8;

/** One app's worth of instances, flattened into the order a mount builds them in. */
interface WalkSet {
    readonly schemas: TExoDomSchema[];
    readonly roots: Element[];
    readonly nodes: Node[][];
}

/**
 * CLONE ONE APP'S CENSUS — app, then per card: the card, its details block if it has one, then
 * its tags. Every clone comes from the same prototype a mount clones, so the nodes the timed loop
 * hops over are the nodes a mount hops over.
 */
function buildWalkSet(): WalkSet {
    const schemas: TExoDomSchema[] = [];
    const roots: Element[] = [];
    const nodes: Node[][] = [];
    const push = (schema: TExoDomSchema, ns: Node[]): void => {
        schemas.push(schema);
        roots.push(schema.proto.cloneNode(true) as Element);
        nodes.push(ns);
    };
    push(APP_PLAN, APP_NODES);
    for (let deck = 0; deck < DECK_N; deck++) {
        push(DECK_PLAN, DECK_NODES);
        const cards = cardsOfDeck(deck);
        for (let k = 0; k < cards.length; k++) {
            const i = cards[k];
            push(CARD_PLAN, CARD_NODES);
            if (startsOpen(i)) push(DETAILS_PLAN, DETAILS_NODES);
            const n = startCount(i);
            for (let t = 0; t < n; t++) push(TAG_PLAN, TAG_NODES);
        }
    }
    if (roots.length !== INSTANCES) {
        throw new Error(
            `mount-phases: built ${roots.length} instances where the app's spec says ` +
                `${INSTANCES} — every per-mount figure below would be scaled wrong`
        );
    }
    return { schemas, roots, nodes };
}

let SETS: WalkSet[] = [];
let setAt = 0;

/** ONE APP'S WORTH OF WALK, over the next pre-cloned set. */
function stageWalkOnly(): void {
    const set = SETS[setAt];
    setAt = setAt + 1 === SETS.length ? 0 : setAt + 1;
    const schemas = set.schemas;
    const roots = set.roots;
    const nodes = set.nodes;
    for (let k = 0; k < roots.length; k++) replay(schemas[k], roots[k], nodes[k]);
}

// ---------------------------------------------------------------------------------------
// THE GATE. Nothing is timed until the replica is shown to build the same tree the renderer
// builds — same element count, same cards, same details blocks, same tags under the same
// parents. A replica that inserted a tag in the wrong place, or built the wrong number of
// anything, would produce a perfectly plausible set of numbers and a wrong answer.
// ---------------------------------------------------------------------------------------

function shapeOf(container: HTMLElement): readonly number[] {
    return [
        container.querySelectorAll('*').length,
        container.querySelectorAll('.card').length,
        container.querySelectorAll('.details').length,
        container.querySelectorAll('.tag').length,
        container.querySelectorAll('.tags > .tag').length,
        container.querySelectorAll('.card > .details').length,
    ];
}

const SHAPE_NAMES = ['elements', '.card', '.details', '.tag', '.tags>.tag', '.card>.details'];

/**
 * THE REPLAY LANDS WHERE THE RENDERER SAYS IT LANDS. One card clone, one replay, and the slot
 * the schema calls the tags region's element has to hold `div.tags`. Without this, a walk that
 * resolved nothing at all (a broken copy of the loop, a schema compiled for another shape) would
 * still cost time and still produce a number.
 */
function gateReplay(): void {
    const card = CARD_PLAN.proto.cloneNode(true) as Element;
    replay(CARD_PLAN, card, CARD_NODES);
    const landed: Node = CARD_NODES[CARD_TAGS_SLOT];
    const seen = landed instanceof Element ? landed.className : landed.nodeName;
    if (seen !== 'tags') {
        throw new Error(
            `mount-phases: the walk replay landed on "${seen}" where the card's schema says slot ` +
                `${CARD_TAGS_SLOT} holds div.tags — the loop is not resolving this schema`
        );
    }
    // eslint-disable-next-line no-console
    console.log(
        `✅ gate mount-phases: the replay resolves — card slot ${CARD_TAGS_SLOT} is div.tags`
    );
}

function gate(): void {
    const realC = el();
    const app = mountExodraApp(realC);
    const real = shapeOf(realC);
    app.teardown();
    realC.remove();

    const repC = el();
    stageCloneWalkInsert(makeSink(), repC);
    const rep = shapeOf(repC);
    repC.remove();

    const wrong = real
        .map((n, k) => (n === rep[k] ? null : `${SHAPE_NAMES[k]}: mount ${n}, replica ${rep[k]}`))
        .filter((x): x is string => x !== null);
    if (wrong.length > 0) {
        throw new Error(
            `mount-phases: the clone/walk/insert replica does not build the mount's tree — ${wrong.join(
                '; '
            )}`
        );
    }
    if (real[1] !== CARD_N || real[2] !== DETAILS_N || real[3] !== TAG_N) {
        throw new Error(
            `mount-phases: the census (${CARD_N} cards, ${DETAILS_N} details, ${TAG_N} tags) ` +
                `does not match a real mount (${real[1]}, ${real[2]}, ${real[3]})`
        );
    }
    // eslint-disable-next-line no-console
    console.log(
        `✅ gate mount-phases: replica builds the mount's tree — ${real[0]} elements, ` +
            `${real[1]} cards, ${real[2]} details, ${real[3]} tags`
    );
}

// ---------------------------------------------------------------------------------------
// THE CENSUS PRINT — static, read off the compiled schemas. Nothing here is measured, and it is
// what makes the timings interpretable: a hop count per mount turns "the walk costs X ms" into
// "X ms for N hops", which is the form in which the number can be argued with.
// ---------------------------------------------------------------------------------------

function printCensus(): number {
    const rows: Array<[string, TExoDomSchema, number]> = [
        ['APP', APP_PLAN, 1],
        ['CARD', CARD_PLAN, CARD_N],
        ['DETAILS', DETAILS_PLAN, DETAILS_N],
        ['TAG', TAG_PLAN, TAG_N],
    ];
    const pad = (s: string | number, n: number): string => String(s).padStart(n);
    // eslint-disable-next-line no-console
    const line = (s: string): void => console.log(`✅ ${s}`);
    line('WALK CENSUS — read off the compiled schemas, nothing measured');
    line('  component   instances   slots   hops/instance   hops/mount');
    let total = 0;
    for (const [name, schema, n] of rows) {
        const hops = schema.walk.length / 3;
        total += hops * n;
        line(
            `  ${name.padEnd(10)} ${pad(n, 9)} ${pad(schema.slots, 7)} ${pad(hops, 15)} ${pad(
                hops * n,
                12
            )}`
        );
    }
    line(
        `  ${'TOTAL'.padEnd(10)} ${pad(INSTANCES, 9)} ${pad('', 7)} ${pad('', 15)} ${pad(
            total,
            12
        )}`
    );
    return total;
}

// ---------------------------------------------------------------------------------------
// THE RUNNER — `abBench`'s sampling, with a repetition factor per phase and the medians handed
// back. See the header for why this is not `abBench` itself.
// ---------------------------------------------------------------------------------------

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

function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

interface Phase {
    /** How the row is labelled. */
    readonly name: string;
    /** How many times one app's worth of this phase runs inside ONE timed region. */
    readonly reps: number;
    /** Untimed setup for one repetition, returning the timed operation and its teardown. */
    readonly prep: () => Scenario;
}

function sampleOnce(phase: Phase): number {
    const reps = phase.reps;
    const scenarios: Scenario[] = [];
    for (let b = 0; b < reps; b++) scenarios.push(phase.prep());
    const t0 = performance.now();
    for (let b = 0; b < reps; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < reps; b++) scenarios[b].cleanup();
    return dt / reps;
}

function runPhases(phases: readonly Phase[], rounds: number): Map<string, Stat> {
    for (let w = 0; w < 10; w++) for (const p of phases) sampleOnce(p);

    const times = new Map<string, number[]>();
    for (const p of phases) times.set(p.name, []);
    for (let r = 0; r < rounds; r++) {
        const shift = r % phases.length;
        const forward = (r & 1) === 0;
        for (let k = 0; k < phases.length; k++) {
            const at = forward
                ? (k + shift) % phases.length
                : (shift + phases.length - 1 - k) % phases.length;
            const p = phases[at];
            gcIfPossible();
            (times.get(p.name) as number[]).push(sampleOnce(p));
        }
    }
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.name, stat(times.get(p.name) as number[]));
    return stats;
}

// ---------------------------------------------------------------------------------------

/** Repetitions per timed region for the four whole-app phases. */
const LADDER_REPS = 20;
/**
 * Repetitions for the isolated walk. One app's worth is ~760 pointer hops, which is a fraction
 * of Chromium's 100 µs clock tick; 400 of them is a region with digits behind the decimal point.
 * It is also what makes this phase's conditions different from the ladder's — caveat (5).
 */
const WALK_REPS = 400;

export function benchmarkMountPhases(rounds = 100): void {
    // eslint-disable-next-line no-console
    const line = (s: string): void => console.log(`✅ ${s}`);
    const f = (x: number): string => x.toFixed(4);
    const pct = (x: number, of: number): string => `${((x / of) * 100).toFixed(1)}%`;

    const hops = printCensus();
    gateReplay();
    gate();

    SETS = [];
    for (let s = 0; s < WALK_SETS; s++) SETS.push(buildWalkSet());
    setAt = 0;

    const noop = (): void => undefined;
    const phases: readonly Phase[] = [
        {
            name: 'clone',
            reps: LADDER_REPS,
            prep: () => {
                const sink = makeSink();
                return { measure: () => stageClone(sink), cleanup: noop };
            },
        },
        {
            name: 'clone+walk',
            reps: LADDER_REPS,
            prep: () => {
                const sink = makeSink();
                return { measure: () => stageCloneWalk(sink), cleanup: noop };
            },
        },
        {
            name: 'clone+walk+ins',
            reps: LADDER_REPS,
            prep: () => {
                const sink = makeSink();
                const c = el();
                return {
                    measure: () => stageCloneWalkInsert(sink, c),
                    cleanup: () => c.remove(),
                };
            },
        },
        {
            name: 'mount',
            reps: LADDER_REPS,
            // The axis's own scenario, line for line (`exodra-initial-render.tsx`): the timed
            // region is the mount and nothing else, and the teardown is outside it. This row is
            // the denominator of every percentage below, so it must be the same measurement the
            // axis publishes rather than a second version of it.
            prep: () => {
                const c = el();
                let app: AppHandle;
                return {
                    measure: () => {
                        app = mountExodraApp(c);
                    },
                    cleanup: () => {
                        app.teardown();
                        c.remove();
                    },
                };
            },
        },
        {
            name: 'walk',
            reps: WALK_REPS,
            prep: () => ({ measure: stageWalkOnly, cleanup: noop }),
        },
    ];

    const stats = runPhases(phases, rounds);
    const median = (name: string): number => (stats.get(name) as Stat).median;

    line(
        `MOUNT PHASES — the 80-card app, schema core [ms per mount] · interleaved · ` +
            `${rounds} rounds · GC/sample`
    );
    line('                 reps   min      p25      median   p75      max');
    for (const p of phases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(16)}${String(p.reps).padStart(5)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}`
        );
    }

    const mount = median('mount');
    const clone = median('clone');
    const walkLadder = median('clone+walk') - clone;
    const insert = median('clone+walk+ins') - median('clone+walk');
    const wire = mount - median('clone+walk+ins');
    const walkIsolated = median('walk');

    line('');
    line(`THE SPLIT — medians, ms per mount, and each as a share of the measured mount`);
    line(`  clone            ${f(clone)}   ${pct(clone, mount)}   ${INSTANCES} cloneNode(true)`);
    line(
        `  walk  [ladder]   ${f(walkLadder)}   ${pct(walkLadder, mount)}   ` +
            `(clone+walk) − clone, ${hops} hops`
    );
    line(
        `  walk  [isolated] ${f(walkIsolated)}   ${pct(walkIsolated, mount)}   ` +
            `the loop alone, ${hops} hops, ${((walkIsolated * 1e6) / hops).toFixed(1)} ns/hop`
    );
    line(`  insert           ${f(insert)}   ${pct(insert, mount)}   ${INSTANCES} insertions`);
    line(
        `  wire + plumbing  ${f(wire)}   ${pct(wire, mount)}   ` +
            `mount − (clone+walk+ins): cb(), connector, regions, subscriptions`
    );
    line(`  mount            ${f(mount)}   100.0%   measured, not derived`);
    line('');
    line(
        `  the mount row is the same scenario as the "exodra" row of exodra-initial-render ` +
            `(0.400 ms when that axis was last read — A CITATION, and it was read on the app ` +
            `BEFORE the three derived values, when a card was five elements and this census was ` +
            `600 hops rather than ${hops}; do not expect this run to reproduce it), with ` +
            `${LADDER_REPS} repetitions per timed region where that axis uses 5 — more live apps ` +
            `in the region, so the two may differ a little. What still has to hold is that this ` +
            `row reads like TODAY's exodra-initial-render on this machine; if it does not, ` +
            `nothing above is comparable to it: check that "npm run build" at the repo root ran.`
    );
    line('');
    line(
        `ANSWER — the per-instance walk replay is ${pct(walkIsolated, mount)} of this app's ` +
            `mount measured alone, and ${pct(walkLadder, mount)} by ladder subtraction. Read the ` +
            `two as a bracket, not as one number, and read caveat (1) in this file's header ` +
            `before spending anything on the difference.`
    );

    // The two estimates bracket the answer only if the ladder actually nests. When it does not,
    // the subtraction is reading noise, and saying so is the whole value of printing both.
    if (walkLadder < 0 || insert < 0 || wire < 0) {
        // eslint-disable-next-line no-console
        console.log(
            '❌ mount-phases: the ladder did not nest (a stage measured cheaper than the stage ' +
                'it contains), so every ladder subtraction above is noise and only the isolated ' +
                'walk figure means anything — raise `rounds`, or read the isolated row alone'
        );
    } else if (walkLadder > walkIsolated * 4) {
        // eslint-disable-next-line no-console
        console.log(
            `❌ mount-phases: the two estimates disagree by more than 4× ` +
                `(${f(walkLadder)} vs ${f(walkIsolated)} ms) — the difference between them is ` +
                'cache behaviour and subtraction noise, and at this spread the answer is a range, ' +
                'not a number'
        );
    }

    // The cloned sets are detached and referenced by nothing else once this is dropped; the
    // containers every timed scenario made were removed by its own `cleanup`.
    SETS = [];
}
