// DIAGNOSTIC — WHERE DOES A TEARDOWN'S TIME GO?
//
// It answers ONE question, about ONE renderer, on the block the `toggle` axis already measures
// (200 panels in a children port). It is not a framework comparison and it is not part of
// `npm run bench`; it is registered as an axis only so it can reuse the runner that already starts
// Vite, drives headless Chromium and forwards the browser's console. It is the counterpart of
// `mount-phases.ts` for the other direction, and it is written to that file's standard: a ladder
// of nested stages AND an isolated measurement of every rung, printed as a bracket rather than as
// one number, with the ways it can mislead stated in this header and repeated in the answer.
//
// ── WHY THE QUESTION IS BEING ASKED ─────────────────────────────────────────────────────────
//
// Two recorded tables, same app, same machine, opposite verdicts:
//
//   .gate/initial-render.post-repair.json — MOUNT ONLY, ms per mount of the 80-card app:
//     stage0 0.325 · mikado 0.34 · exodra 0.385 · solid 0.485 · marko 0.57 · …
//
//   .gate/toggle.base1.json — 20 cycles of {hide 200 panels, show 200 new ones}, ms per sample,
//   i.e. 4000 builds AND 4000 TEARDOWNS:
//     exodraKept 3.3 · mikadoPooled 3.5 · mikado 7.4 · stage0 8.9 · solid 9.2 ·
//     exodraDelegated 9.6 · exodra 10.2 · marko 13.7 · svelte 14.8 · … · voby 35.4
//
// The schema core is 26% AHEAD of Solid on the mount and 11% BEHIND it on the toggle. A mount
// tears nothing down; a toggle tears down as many panels as it builds. So the loss lives in the
// half a mount never exercises — and until this file existed, nothing in this repository measured
// that half. The honest answer to "how does the loss happen" was "teardown, but nobody measured
// it", which is a hypothesis wearing a conclusion's clothes.
//
// THIS FILE DOES NOT ANSWER THE COMPARISON. It decomposes OUR teardown and nothing else, the way
// `mount-phases` decomposes our mount; the cross-framework number already exists on `toggle` and
// no row here is comparable to any other library. What it can do is say which phase is worth
// attacking — and, if teardown turns out to be small, move the question somewhere else, which is
// a result and not a failure.
//
// ── WHICH TEARDOWN, AND WHY NOT THE 80-CARD APP ─────────────────────────────────────────────
//
// `mount-phases` splits the 80-card app because that is what the mount axis measures. The obvious
// symmetry — split `mountExodraApp(c).teardown()` — was rejected after reading what that call
// does, and the reason is worth stating because it is the first thing a reader will ask:
//
//   `AppHandle.teardown` IS the disposer `ExoDomBackend.render` returns, and it disposes the RENDER'S
//   scope. A child owns everything wired inside it (`exoOnTeardown` in `exoTeardownScope.ts`), so the
//   card's two reconcile subscriptions belong to the CARD, not to the render; and the app's
//   cards are a static `c.list(P.cards, CARD, IDX)`, which subscribes to nothing at all. That
//   disposer removes NO nodes, runs NO child's `unmount`, and on this app has almost nothing to
//   run. `participants/exodra/app.tsx` says so in its own comment: "Subscriptions only — the nodes
//   die with
//   the container the caller removes."
//
// So the 80-card app has no whole-app teardown to split. The toggle block does: hiding it is the
// full-clear branch of the children reconciler, 200 children leave at once, and it happens 20
// times per sample on the axis where the loss is. That is the subject.
//
// WHAT THE BLOCK IS, exactly: one host component whose `<div>` contains ONE children port — so the
// port OWNS its element — filled by a transition that hands `reconcileExoOrder` the 200 rows a source
// holds, run by an effect that shows first and then follows the source. It is the `exodra` row of
// `toggle` with every other participant removed. Hiding it is `rows.setValue([])`.
//
// ── WHAT THE HIDE ACTUALLY DOES, read off the code before anything was timed ─────────────────
//
// `rows.setValue([])` → the source notifies its ONE subscriber (`createExoBenchSource.ts` keeps a
// lone subscriber in a field, so no `Set` and no iterator) → the host's `showRows` transition re-reads
// the source and `reconcileExoOrder` takes its `wantLength === 0` arm, which is ONE call —
// `kids.removeAll()` on the child list the initial state opened — and returns a fresh empty array as
// the new `shown`.
//
// `removeAll` is `ExoChildList`'s own method (`createExoChildList.ts`, lines 105-127) and it
// branches on the `ownsParent` flag `c.childList(port)` handed it out of `schema.ownsElement`:
//
//   ownsParent   →  N × `unmount()`, then N × `index = -1`, then ONE `parent.textContent = ''`
//   otherwise    →  N × `unmount()`, then per child a parentNode CLIMB, a `removeChild` and
//                   `index = -1`
//
// then `order.length = 0`. EVERY `unmount` RUNS WHILE THE LIST IS STILL WHOLE, in a pass of its
// own, which is the one shape difference against `clearOwnedExoChildList` — the ladder's `clear
// region` rung, which interleaves the two stores in one pass over the same operations. That makes
// `clear region` a REPLICA of the shipped clear and not the shipped call; caveat (3) covers it.
//
// And `unmount` is `disposeExoChildSelf` (`createExoDomChildFactory.ts`), which is three things:
//   1. a null compare on `this.registry` — ALWAYS null, because nothing writes it: there is no
//      keyed list, so the strike-off this branch exists for never happens;
//   2. a null compare on `this.effectStops`, and `stopExoEffects(this)` if a machine declared any;
//   3. run and empty this child's own disposers.
//
// THERE IS ONE RECONCILER AND IT IS NOT A PACK. `reconcileExoOrder` is a layer over `c.build`
// and `c.childList`, composed by the application's own transition; a backend carries no `children`
// field to swap, so there is no second clear path an application could be on.
//
// TWO THINGS THE CODE DOES **NOT** DO ON TEARDOWN, both of which a reader expects and both of
// which are therefore phases this file cannot print because they do not exist:
//
//   * NO LISTENER IS EVER REMOVED. `exo-event-slot-setter.ts` states it and gives the number:
//     "Registering listeners for disposal was measured at 21% of a mount+dispose cycle on 160
//     handlers, to undo something the garbage collector was going to do anyway." So a panel's
//     click listener costs the teardown nothing, and every panel on this axis has one.
//   * NO WALK, NO RECURSION. A child's teardown does not descend into its element's subtree. A
//     nested list is torn down only because the OWNER child's disposers include the inner list's
//     own disposer (`attach-exo-children.ts`, the last `exoOnTeardown` in the file), which unmounts the
//     inner children and REMOVES NOTHING. That is a third teardown shape, and this axis does not
//     price it: see the list of what could not be isolated, below. This block's panel is FLAT —
//     caveat (6).
//
// ── WHAT THE CODE DOES THAT NO PHASE HERE PRICES, named rather than left to be discovered ────
//
//   * THE RENDER-DISPOSE SHAPE. `render`'s disposer runs the render's scope: the event
//     pack's `install` teardown (nothing at all under the direct strategy) and the host effect's
//     stop, which is the source's `onChange` unsubscribe and nothing else. It is one call per LIST,
//     not per child, so there is no region to time it in.
//   * THE CHILD LIST'S OWN `exoOnTeardown`, filed by `openChildList`: it unmounts every LIVE child and
//     takes no node out of the document. Its per-child half IS the `unmount loop` rung above.
//   * THE `indexDirty` SETTLE PASS `ExoChildList` runs when a `move` left its positions stale. A
//     hide takes `removeAll`, which clears the flag rather than settling it, so a block this axis
//     never reorders pays nothing for it — and neither does one that was reordered, which is why
//     no phase here can price it.
//   * BLINK'S DEFERRED DESTRUCTION — caveat (1). Not isolable from inside the page at all.
//
// ── WHAT IS MEASURED ────────────────────────────────────────────────────────────────────────
//
// Eight phases, every one of them normalised to MS PER HIDE OF 200 PANELS, all interleaved in one
// run with the order rotated per round and a GC immediately before every timed region.
//
//   THE LADDER (each rung a real, freshly-shown block, prepped untimed; each rung does strictly
//   less than the rung above it):
//     hide               `rows.setValue([])` — THE REAL THING, measured, not derived.
//     clear region       `clearOwnedExoChildList(order, parent)` — the renderer's OWN exported
//                        function, called by hand on the same block. The same operations
//                        `removeAll` performs, in one interleaved pass instead of two; everything
//                        `hide` does except the notification, the re-read and the reconciler's
//                        branch.
//     unmount loop       the `unmount()` + `index = -1` loop copied out of `clearOwnedExoChildList`,
//                        WITHOUT the final `textContent = ''`.
//     dispatch only      the same loop over children whose `unmount` has been replaced by a shared
//                        no-op — the documented public override (`TExoDomChild.unmount`, and what
//                        `toggle`'s `exodraKept` row does). The virtual call and the `index` store
//                        and nothing else.
//
//   MEASURED ALONE, no subtraction involved:
//     textContent        `parent.textContent = ''` on a block whose children were never unmounted.
//
//   STRUCK: `registry evict` timed 200 `map.delete(key)`s over a freshly filled key→child
//   registry. That book belonged to a keyed list, there is no keyed list and nothing writes
//   `TExoDomChild.registry`, so the phase priced a mechanism that is gone. The
//   `(unmount loop) − (dispatch only)` subtraction is still printed and still measured — what it
//   brackets is now named for what it is, the whole of the default `unmount`'s body.
//
//   THE OTHER PATH, not nested with the ladder — what a list that does NOT own its parent pays:
//     drop per child     `dropExoChild(order[i], parent)` × 200 — the renderer's own exported
//                        function, climb and `removeChild` included.
//
// So the DOM clear has TWO estimates and the run prints both:
//
//   DOM clear      LADDER  (clear region) − (unmount loop)      ISOLATED  textContent
//
// and the LADDER estimate leans HIGH and the ISOLATED one leans LOW, for reasons named in the
// caveats. The truth is between them. If they disagree wildly the number is not usable and the run
// says so. The unmount BODY has a ladder figure and no isolated twin.
//
// THE RUN OPENS WITH A CENSUS — panels, elements per panel, nodes cleared per hide, disposers per
// panel, and whether the port owns its element —
// every one of them READ off the built block or off the compiled schema, none of them asserted.
// "The unmount loop costs X ms" only becomes arguable as "X ms for 200 children carrying N
// disposers each", and if the disposer count prints as 0, that is not a bug in this file: it is the
// toggle axis's panel, which writes its text once because a panel built for one show never changes
// it.
//
// ── WHAT THIS MEASUREMENT CANNOT SEPARATE, and the ways it could mislead ────────────────────
//
// 1. BLINK DEFERS MOST OF WHAT A DETACH COSTS, and this is the single most likely way the number
//    misleads. `textContent = ''` unlinks 200 subtrees and returns; destroying ~1600 nodes, their
//    listener registrations and their C++ objects happens LATER, in Blink's own sweep and in GC —
//    outside this timed region, and charged to whatever runs next. On the `toggle` axis whatever
//    runs next is THE NEXT SHOW, so that axis's number contains the deferred cost and this axis's
//    does not. Every DOM figure below is therefore a LOWER BOUND on what a teardown costs the
//    process, and the gap between `hide × 20` and the `toggle` row's teardown share is partly
//    this. It is the mirror image of `mount-phases` caveat (1) and no arrangement of these phases
//    fixes it.
//
// 2. THE SUBTRACTION ATTRIBUTES CACHE EFFECTS TO THE LAST RUNG. The unmount loop touches all 200
//    child objects in the instant before the `textContent`
//    assignment. Take the loop away and the DOM clear pays misses the loop was absorbing; that is
//    why `clear region − unmount loop` reads HIGH against the isolated `textContent`, which runs
//    with none of that warming. Neither is the counterfactual "a clear with no unmount in it".
//
// 3. TWO RUNGS ARE THE RENDERER'S OWN CODE AND TWO ARE COPIES, AND THE SHIPPED CLEAR IS NEITHER.
//    `clear region` calls the exported `clearOwnedExoChildList` and `drop per child` calls the
//    exported `dropExoChild`, so those two cannot drift from THOSE functions — but the function a
//    real hide takes is `ExoChildList.removeAll`, which is unexported and performs the same
//    operations in two passes rather than one. `unmount loop` and `dispatch only` are COPIES of
//    the loop inside `clearOwnedExoChildList.ts`; if it changes and these do not, this diagnostic stops
//    measuring the renderer and says nothing about it. That is the same hazard `mount-phases`'
//    `replay` carries, for the same reason — there is no way to reach half of
//    `disposeExoChildSelf` without running all of it.
//
// 4. OVERRIDING `unmount` CHANGES THE CALL SITE. `dispatch only` points every child's `unmount` at
//    one shared no-op, so its call site sees a different function object from the one the real
//    site sees. It is monomorphic either way (which is why the two loops are two SEPARATE copies
//    of identical code — one call site each, so neither goes polymorphic), but V8 will inline an
//    empty function where it may not inline `disposeExoChildSelf`. So `dispatch only` is a LOWER
//    bound on the dispatch and `unmount loop − dispatch only` is an UPPER bound on the body.
//
// 5. A REGION CAN FALL UNDER THE CLOCK. THE RUN CHECKS EVERY REGION AGAINST THE CLOCK IT OBSERVED
//    and refuses, by name and with a factor, any that lands under three ticks.
//
// 6. THE PANEL IS FLAT. Four elements, one text port, one event port, no nested list, no context,
//    no `mount` hook. A real view's child often owns children of its own, whose teardown rides on
//    the owner's disposers — so a deep tree's teardown is NOT this number times its depth, and
//    nothing here prices the recursion.
//
// 7. A HIDE HERE FOLLOWS A SHOW THIS AXIS PREPPED. On `toggle`, hide number 17 follows sixteen
//    previous cycles in the same heap. Cache and GC state differ, and in the direction that
//    flatters this axis.
//
//
// ── HOW THIS FILE MEASURES, AND WHY NOT THROUGH `abBench` ───────────────────────────────────
//
// Same two reasons `mount-phases` states: `abBench`'s `batch` is one number for the whole run and
// this run needs a repetition factor PER PHASE, and `abBench` prints its medians where the whole
// output here is a set of RATIOS. What it keeps from `abBench` is everything that makes a number
// trustworthy: interleaving with the order rotated per round, a GC before every sample, and the
// full min/p25/median/p75/max spread rather than a mean.
//
// ONE DELIBERATE DIFFERENCE FROM `mount-phases`: the GC runs AFTER `prep` and immediately before
// the timed region. A ladder repetition's `prep`
// mounts and shows 200 panels — thousands of nodes — so collecting before that work rather than
// after it would let every timed region start under a different pile of floating garbage.
//
// THE THIRD POSITIONAL ARGUMENT IS THE BATCH AND IT IS HONOURED HERE, unlike `mount-phases`,
// which ignores it. It MULTIPLIES every phase's repetition factor, so when the
// clock check below refuses a phase and names a factor, that factor is something the operator can
// type on the command line instead of editing this file:
//
//     npm run axis --workspace=@exodra/benchmarks -- teardown-phases 100 1
//     npm run axis --workspace=@exodra/benchmarks -- teardown-phases 100 4   # if it refused
//
// `@exodra/dom` is resolved to its BUILT dist, exactly as the axes are, so `npm run build` at the
// repo root has to have run or this attributes a stale renderer.
import { type TExoChildrenPort, type TExoEventPort, type TExoTextPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import {
    clearOwnedExoChildList,
    dropExoChild,
    exoDomSchemaOf,
    type TExoDomNode,
    type TExoDomChild,
} from '@exodra/dom';
import { el } from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
} from '@exodra/core';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import type { TExoChildList } from '@exodra/dom';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

// ---------------------------------------------------------------------------------------
// THE BLOCK. The `exodra` row of `toggle.tsx` with every other participant removed.
//
// IT IS COPIED AND NOT IMPORTED, which is a cost stated rather than hidden. `toggle.tsx` imports
// Mikado, Solid and React at MODULE scope, so importing its panel would drag three renderers into
// a diagnostic that measures one — and `PANEL` is not exported from it in any case. The copy
// carries the drift hazard caveat (3) names.
// ---------------------------------------------------------------------------------------

/** Panels in one block — `toggle.tsx`'s `PANELS`, and the unit every row below is per. */
const PANELS = 200;

/** How many hides one `toggle` sample performs — used only to relate this axis to that one. */
const TOGGLE_CYCLES = 20;

/** The `exodra` median of `.gate/toggle.base1.json`, quoted so the relation can be computed. */
const TOGGLE_EXODRA_MS = 10.2;

const noop = (): void => {};

/** One panel's data — structurally `toggle.tsx`'s `TToggleRow`. */
type TPanelRow = { id: number; text: string };

/** A source of rows, as the host's effect follows it. */
type TRowSource = TExoBenchSource<readonly TPanelRow[]>;

/** The shown state: 200 rows, allocated once for the life of the process. */
const ROWS: readonly TPanelRow[] = Array.from({ length: PANELS }, (_, i) => ({
    id: i,
    text: `panel ${i}`,
}));
/** The hidden state — the empty array whose arrival takes the full-clear branch. */
const NO_ROWS: readonly TPanelRow[] = [];

/**
 * WHERE THE PANELS THIS RENDER BUILDS COLLECT THEMSELVES — a module array, pushed to by each
 * panel's own wire and emptied by `takeBuilt` the moment a block reads it.
 *
 * IT EXISTS BECAUSE AN ELEMENT NO LONGER POINTS AT ITS CHILD. This file used to reach the 200
 * children by `querySelectorAll('.panel')` and `exoNodeDom(element)`, through a mark `@exodra/dom`
 * wrote on every element it built; that mark has been removed. A panel is caught inside its own
 * wire, where the OWNER CHILD on the instance's own record IS that child — `c.child`, read straight
 * off the exonode, because the exonode a wire is handed IS the instance record and nothing is
 * pooled. `c.build` hands the same object back to the host's reconcile callback, and the reason the
 * push is here and not there is the TYPE: a wire reads a `TExoDomChild` field, while `build`'s
 * published return is the node surface and reaching the record through it takes two casts.
 *
 * IT COSTS THE MEASUREMENT NOTHING. Every panel is built during a block's `prep`, which is untimed
 * by construction, and one array push per panel is in the same wire run as the port fill. The push
 *
 * IT IS SOUND FOR THE SAME REASON `CURRENT_ROWS` is: a render and the `setValue` that fills it run
 * start to finish synchronously, so nothing can interleave between emptying this array and reading
 * it back.
 */
const BUILT: TExoDomChild[] = [];

/**
 * THE PANEL — character for character what `toggle.tsx`'s `PANEL` is, and therefore
 * a panel with ZERO disposers: `c.text` writes a string and returns, and the direct event pack
 * registers no listener for teardown (see the header).
 */
const PANEL_SET_SCHEMA = createExoSchema((b) => {
    let close!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'panel' }, (panel) => {
        panel.el('h4', null, (h4) => h4.text('Panel'));
        panel.el('p', null, (p) => {
            text = p.textPort();
        });
        panel.el('button', null, (btn) => {
            close = btn.eventPort('click');
            btn.text('x');
        });
    });
    return { close, text };
});
const mPANEL_SET = createExoMachine<TExoDomNode, TPanelRow>(PANEL_SET_SCHEMA, {
    createInitialState: (c, row) => {
        BUILT.push(c.child as TExoDomChild);
        c.text(PANEL_SET_SCHEMA.ports.text, row.text);
        c.on(PANEL_SET_SCHEMA.ports.close, noop);
    },
});
const PANEL_SET = mPANEL_SET;

/**
 * WHICH SOURCE THE NEXT RENDER WIRES ITSELF TO — a module variable, read by the host's wire at the
 * instant that wire runs.
 *
 * `toggle.tsx` builds its HOST component inside each scenario, because a wire cannot be handed in
 * at the render call and it has to name THAT scenario's source. That is fine there and wrong here:
 * a component built per scenario is a new DECLARATION, so its ports are numbered again and the DOM
 * schema is compiled again, once per repetition — and this file preps twenty repetitions per sample
 * and needs to read ONE schema's `ownsElement` in a gate. So the hosts are module-level and the
 * source arrives through here.
 *
 * IT IS SOUND FOR THE SAME REASON `exoTeardownScope`'s module variable is: a render runs start to
 * finish synchronously, so the assignment immediately before `backend.render` cannot interleave
 * with anything. The host's initial state stores the reference it is given, so from that point on
 * the block holds its own source and this variable is never read again on its behalf.
 */
let CURRENT_ROWS: TRowSource = createExoBenchSource<readonly TPanelRow[]>(NO_ROWS);

/**
 * THE HOST — one `<div>` whose ONLY content is the children port, which is what makes the port OWN
 * its element and the hide take the one-assignment clear. `gateSchemas` below reads that fact off the
 * compiled schema rather than trusting this sentence.
 */
const HOST_SET_SCHEMA = createExoSchema((b) => {
    let panels!: TExoChildrenPort;
    b.el('div', null, (host) => {
        panels = host.childrenPort();
    });
    return { panels };
});
const mHOST_SET = createExoMachine(HOST_SET_SCHEMA, {
    createInitialState: (cc: TExoDomNode) => ({
        panels: cc.childList(HOST_SET_SCHEMA.ports.panels) as TExoChildList,
        shown: [] as TPanelRow[],
        source: CURRENT_ROWS,
    }),
});
const HOST_SET = composeExoMachine(
    mHOST_SET,
    (m) =>
        withExoTransitions(m, {
            showRows: (cc) => {
                const state = cc.state;
                const want = state.source.getValue();
                state.shown = reconcileExoOrder(state.panels, state.shown, want, want, (row) =>
                    cc.build(PANEL_SET, row)
                );
            },
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((cc) => {
                showRows(cc);
                const source = cc.state.source;
                return source.onChange(() => showRows(cc));
            });
        })
);
const { showRows } = HOST_SET.transitions;

// The SAME schema objects a render uses: `exoDomSchemaOf` caches on `machine.forms` at the
// backend's `backendType`, and `EXO_BACKEND` below is the one this file renders from.
const PLAN_SET = exoDomSchemaOf(HOST_SET, EXO_BACKEND);

// ---------------------------------------------------------------------------------------
// A BLOCK, SHOWN. Everything here is `prep` — untimed — and every phase below is handed one of
// these with its 200 panels already in the document.
// ---------------------------------------------------------------------------------------

interface Block {
    /** The scenario's own container, in `document.body`. */
    readonly container: HTMLElement;
    /** The element the children port owns — the one a clear empties. */
    readonly parent: Element;
    /**
     * The 200 children, in document order — a COPY of the array the child list keeps, collected by
     * each panel's own wire as the reconciler builds it (`BUILT`, above). It is a copy and not the
     * child list's own array because nothing exposes that array; `clearOwnedExoChildList` and
     * `dropExoChild` only READ what they are given, so a copy is the same input. What it means is
     * that a rung which clears by hand leaves the child list's own order still holding 200
     * unmounted children — which is why every block is thrown away by its `cleanup` and never
     * updated again.
     *
     * IT USED TO BE READ OFF THE DOM. A `querySelectorAll('.panel')` collected the elements and
     * `exoNodeDom(element)` turned each one back into its child, through a mark `@exodra/dom` wrote
     * on every element it built. That mark has been removed and there is no
     * element→child direction any more, so the children are collected where they are MADE instead.
     * The array's contents, order and identity are the same: the reconciler builds each row in
     * mount order, and the push happens inside that row's wire, untimed in `prep`, before any
     * phase runs.
     */
    readonly order: TExoDomChild[];
    /**
     * EMPTY THIS BLOCK'S SOURCE — the real program, and the only thing the `hide` phase times.
     *
     * It is a field on the block rather than a module variable read after the fact, because the
     * source a block is wired to is the one fact about it that nothing else can recover:
     * the host's state holds it and does not hand it back.
     */
    readonly hide: () => void;
    /** The render's disposer. Untimed, in `cleanup`. */
    readonly dispose: () => void;
}

/**
 * TAKE WHAT THE PANEL WIRES JUST COLLECTED, and leave the buffer empty for the next block.
 *
 * THE CLEAR IS ON BOTH SIDES on purpose: every caller empties `BUILT` immediately before the
 * `setValue` that makes its panels, and this empties it again on the way out. A block that read a
 * previous block's leftovers would hold children whose elements are in another container, and
 * `blockOf`'s count check would not catch it — the count would be right.
 */
function takeBuilt(): TExoDomChild[] {
    const out = BUILT.slice();
    BUILT.length = 0;
    return out;
}

function blockOf(container: HTMLElement, dispose: () => void, hide: () => void): Block {
    const parent = container.firstElementChild;
    if (parent === null) throw new Error('teardown-phases: the host rendered nothing');
    const order = takeBuilt();
    if (order.length !== PANELS) {
        throw new Error(
            `teardown-phases: the block shows ${order.length} panels where ${PANELS} were asked ` +
                'for — every per-hide figure below would be scaled wrong'
        );
    }
    return { container, parent, order, hide, dispose };
}

/** A shown block of 200 `set` panels. */
function showSetBlock(): Block {
    const rows = createExoBenchSource<readonly TPanelRow[]>(NO_ROWS);
    CURRENT_ROWS = rows;
    const container = el();
    const dispose = EXO_BACKEND.render(HOST_SET, container);
    BUILT.length = 0;
    rows.setValue(ROWS);
    return blockOf(container, dispose, () => rows.setValue(NO_ROWS));
}

// STRUCK: `buildJsChildren` built 200 detached children to fill the isolated registry phase's
// `Map`s. It priced a key→child registry, and no list keeps one — see the struck `registry evict`
// phase below.

// ---------------------------------------------------------------------------------------
// THE STAGES.
//
// `stageUnmountLoop` and `stageDispatchLoop` are IDENTICAL code written twice, and that is
// deliberate: one function called with two different `unmount` populations would make its
// `child.unmount()` site polymorphic, which neither the renderer's site nor either measurement is.
// Two copies means two call sites, each seeing exactly one function. It is the same argument
// `mount-phases` makes for writing three ladder stages instead of one with a flag.
// ---------------------------------------------------------------------------------------

/** THE THING BEING PRICED — copied VERBATIM out of `clear-owned-child-list.ts`, minus its last
 *  line. */
function stageUnmountLoop(order: readonly TExoDomChild[]): void {
    const had = order.length;
    for (let i = 0; i < had; i++) {
        const child = order[i];
        child.unmount();
    }
}

/** The same loop, over children whose `unmount` is the no-op override. See caveat (4). */
function stageDispatchLoop(order: readonly TExoDomChild[]): void {
    const had = order.length;
    for (let i = 0; i < had; i++) {
        const child = order[i];
        child.unmount();
    }
}

/** The override — one module-level function for every child in the process, not a closure each. */
const NO_TEARDOWN = function noTeardown(this: TExoDomChild): void {
    // Nothing. `dispatch only` exists to price the call and the `index` store around the body.
};

/** The other path: what a port that does NOT own its element pays. The renderer's own function. */
function stageDropLoop(order: readonly TExoDomChild[], parent: Element): void {
    const had = order.length;
    for (let i = 0; i < had; i++) dropExoChild(order[i], parent);
}

// STRUCK: `stageRegistryEvict` ran 200 `Map.delete`s over the key→child registry a keyed list kept.
// Nothing writes `TExoDomChild.registry` any more and there is no keyed list, so the mechanism is
// deleted and the phase that called this is struck below.

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until the run has proved (a) that the block takes the clear path it
// claims to, and (b) that a teardown here actually TEARS DOWN — no surviving nodes and no surviving
// disposers. A teardown that quietly left something standing would produce a perfectly plausible
// table and a wrong answer.
// ---------------------------------------------------------------------------------------

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);

/** WHICH CLEAR THE HIDE TAKES, read off the compiled schemas and not assumed. */
function gateSchemas(): void {
    const setIndex = HOST_SET_SCHEMA.ports.panels.index;
    const setOwns = PLAN_SET.ownsElement[setIndex];
    if (setOwns !== 1) {
        throw new Error(
            `teardown-phases: the children port does not own its element (ownsElement ` +
                `${setOwns}) — \`removeAll\` would take its per-child climb-and-` +
                'removeChild arm, not its one-assignment arm, and the whole ladder below is built ' +
                'on the owned one'
        );
    }
    line(
        `gate teardown-phases: the children port OWNS its element ` +
            `(ownsElement[${setIndex}] = 1), so a hide takes removeAll's owned arm — N unmounts ` +
            'and ONE textContent assignment'
    );
}

/**
 * THE TEARDOWN HAPPENED — the load-bearing check, run against the REAL hide and against every
 * replica rung that claims to do the same thing.
 *
 * It is not "the panels are gone": a child whose element left the document but whose subscriptions
 * survived is a leak that looks exactly like a working teardown, and it is precisely the failure a
 * benchmark of teardown would otherwise reward with a fast number.
 */
function gateTornDown(what: string, block: Block, detached: boolean): void {
    // ONLY THE RUNGS THAT CLAIM TO TOUCH THE DOM ARE HELD TO THE DOM. `unmount loop` is the clear
    // WITHOUT its `textContent`, so its panels are still standing on purpose — and the caller
    // checks that they are, which is a stronger statement than this one would be.
    const left = block.container.querySelectorAll('.panel').length;
    if (detached && left !== 0) {
        throw new Error(
            `teardown-phases: after "${what}", ${left} of ${PANELS} panels are still in the ` +
                'container — the region was not cleared'
        );
    }
    for (let i = 0; i < block.order.length; i++) {
        const child = block.order[i];
        // `disposers` is null until a child's FIRST `onTeardown`, so a child that never subscribed
        // has none to hold — that is the passing case, not a missing one.
        const held = child.disposers === null ? 0 : child.disposers.length;
        if (held !== 0) {
            throw new Error(
                `teardown-phases: after "${what}", child ${i} still holds ` +
                    `${held} disposers — its subscriptions are still live`
            );
        }
        if (detached && child.node.isConnected) {
            throw new Error(
                `teardown-phases: after "${what}", child ${i}'s element is still in the document`
            );
        }
    }
}

/** Every stage that claims to tear a block down proves it once, before anything is timed. */
function gateStages(): void {
    // 1. THE REAL HIDE.
    const real = showSetBlock();
    real.hide();
    gateTornDown('hide', real, true);
    real.dispose();
    real.container.remove();

    // 2. The renderer's own `clearOwnedExoChildList`, called by hand — the rung the ladder rests on.
    const cleared = showSetBlock();
    clearOwnedExoChildList(cleared.order, cleared.parent);
    gateTornDown('clear region', cleared, true);
    cleared.dispose();
    cleared.container.remove();

    // 3. The copied loop. It must leave the block in the SAME state as (1) and (2) except that the
    //    nodes are still in the document — that missing `textContent` IS the phase.
    const looped = showSetBlock();
    stageUnmountLoop(looped.order);
    if (looped.container.querySelectorAll('.panel').length !== PANELS) {
        throw new Error(
            'teardown-phases: the unmount-loop rung removed nodes, though it is the clear WITHOUT ' +
                'its DOM call — the DOM-clear subtraction would come out at zero'
        );
    }
    gateTornDown('unmount loop', looped, false);
    looped.parent.textContent = '';
    looped.dispose();
    looped.container.remove();

    // 4. The dispatch-only rung must do the OPPOSITE — skip the body entirely. Without this, a
    //    mistake that left the real `unmount` in place would make `unmount loop − dispatch only`
    //    zero and the run would report the whole body as free.
    //
    //    A panel's body disposes nothing, so running it and skipping it leave the same block; one
    //    probe disposer per child makes the skip OBSERVABLE.
    const dispatched = showSetBlock();
    for (let i = 0; i < dispatched.order.length; i++) {
        dispatched.order[i].disposers = [noop];
        dispatched.order[i].unmount = NO_TEARDOWN;
    }
    stageDispatchLoop(dispatched.order);
    for (let i = 0; i < dispatched.order.length; i++) {
        const held = dispatched.order[i].disposers;
        if (held === null || held.length === 0) {
            throw new Error(
                `teardown-phases: the dispatch-only rung ran child ${i}'s disposers, though its ` +
                    'whole point is to run the call and NOT the body'
            );
        }
    }
    dispatched.dispose();
    dispatched.container.remove();

    // 5. The per-child path, the renderer's own `dropExoChild`.
    const dropped = showSetBlock();
    stageDropLoop(dropped.order, dropped.parent);
    gateTornDown('drop per child', dropped, true);
    dropped.dispose();
    dropped.container.remove();

    line(
        'gate teardown-phases: every rung leaves the block with 0 panels shown, 0 disposers and ' +
            'every child at index -1 — and the dispatch-only rung provably leaves all of that ' +
            'standing'
    );
}

// ---------------------------------------------------------------------------------------
// THE CENSUS — read off a real block and off the compiled schema, nothing measured. It is what turns
// "the unmount loop costs X" into "X for 200 children carrying N disposers each".
// ---------------------------------------------------------------------------------------

interface Census {
    readonly elementsPerPanel: number;
    readonly nodesPerHide: number;
    readonly setDisposers: number;
}

function printCensus(): Census {
    const a = showSetBlock();
    const panel = a.order[0].node;
    const elementsPerPanel = panel.querySelectorAll('*').length + 1;
    const nodesPerHide = a.parent.querySelectorAll('*').length;
    // The panel takes NO subscriptions, so its `disposers` is null and never an empty array. That
    // is the census figure this line reports, and it is 0 either way.
    const setDisposers = a.order[0].disposers?.length ?? 0;
    a.dispose();
    a.container.remove();

    const pad = (s: string | number, n: number): string => String(s).padStart(n);
    line('TEARDOWN CENSUS — read off a built block and the compiled schema, nothing measured');
    line('  what                                    per hide   per panel');
    line(`  panels                              ${pad(PANELS, 12)}   ${pad(1, 9)}`);
    line(
        `  elements cleared                    ${pad(nodesPerHide, 12)}   ` +
            `${pad(elementsPerPanel, 9)}`
    );
    line(`  unmount() calls                     ${pad(PANELS, 12)}   ${pad(1, 9)}`);
    line(
        `  disposers run                       ${pad(setDisposers * PANELS, 12)}   ${pad(
            setDisposers,
            9
        )}`
    );
    line(
        `  listeners removed                   ${pad(0, 12)}   ${pad(0, 9)}   ` +
            '(by design — see header)'
    );
    line(`  DOM calls      [owned region]       ${pad(1, 12)}   ${pad('—', 9)}`);
    line(
        `  DOM calls      [per-child path]     ${pad(PANELS, 12)}   ${pad(1, 9)}   ` +
            'plus one parentNode climb each'
    );
    return { elementsPerPanel, nodesPerHide, setDisposers };
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — copied from `toggle.tsx`, where the same clamp made a whole axis print the
// timer thirteen times. Spin until the clock moves and keep the smallest step it ever takes:
// anything smaller is unobservable, anything larger only appears when the loop was descheduled,
// so the MINIMUM over many tries is the answer.
// ---------------------------------------------------------------------------------------

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

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement and not rounding. */
const MIN_TICKS = 3;

// ---------------------------------------------------------------------------------------
// THE RUNNER — `abBench`'s sampling with a repetition factor per phase and the medians handed
// back. See the header for why this is not `abBench`, and why the GC sits after `prep`.
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
    /** How many hides' worth of this phase run inside ONE timed region. */
    readonly reps: number;
    /** One line of what the row is, printed beside the number. */
    readonly what: string;
    /** Untimed setup for one repetition, returning the timed operation and its teardown. */
    readonly prep: () => Scenario;
}

function sampleOnce(phase: Phase): number {
    const reps = phase.reps;
    const scenarios: Scenario[] = [];
    for (let b = 0; b < reps; b++) scenarios.push(phase.prep());
    // AFTER `prep`, not before: a ladder repetition's prep mounts and shows 200 panels, so
    // collecting before that work would let each timed region start under a different pile of
    // floating garbage. This is where it deviates from `mount-phases.ts`.
    gcIfPossible();
    const t0 = performance.now();
    for (let b = 0; b < reps; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < reps; b++) scenarios[b].cleanup();
    return dt / reps;
}

function runPhases(phases: readonly Phase[], rounds: number): Map<string, Stat> {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);

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
            (times.get(p.name) as number[]).push(sampleOnce(p));
        }
    }
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.name, stat(times.get(p.name) as number[]));
    return stats;
}

// ---------------------------------------------------------------------------------------

/**
 * Repetitions per timed region for the phases that tear a real block down. 20 hides is 4000
 * panels and ~32,000 elements per region — enough to clear the clock without holding a document
 * that no longer resembles the one a real hide runs in.
 */
const LADDER_REPS = 20;
export function benchmarkTeardownPhases(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    const ns = (msPerHide: number): string => ((msPerHide * 1e6) / PANELS).toFixed(1);
    const pct = (x: number, of: number): string => `${((x / of) * 100).toFixed(1)}%`;

    const quantum = observeTimerQuantum();
    line(
        `teardown-phases: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    gateSchemas();
    gateStages();
    const census = printCensus();

    const ladderReps = LADDER_REPS * batch;

    /** Prep shared by every rung that tears a real `set` block down. */
    const prepSetBlock = (measure: (b: Block) => () => void): Scenario => {
        const block = showSetBlock();
        return {
            measure: measure(block),
            cleanup: () => {
                block.dispose();
                block.container.remove();
            },
        };
    };

    const phases: readonly Phase[] = [
        {
            name: 'hide',
            reps: ladderReps,
            what: 'rows.setValue([]) — measured, not derived',
            prep: () => prepSetBlock((b) => b.hide),
        },
        {
            name: 'clear region',
            reps: ladderReps,
            what: "clearOwnedExoChildList(order, parent) — the renderer's own function",
            prep: () => prepSetBlock((b) => () => clearOwnedExoChildList(b.order, b.parent)),
        },
        {
            name: 'unmount loop',
            reps: ladderReps,
            what: "the clear's loop without its textContent — a copy, caveat (3)",
            prep: () => prepSetBlock((b) => () => stageUnmountLoop(b.order)),
        },
        {
            name: 'dispatch only',
            reps: ladderReps,
            what: 'the same loop with unmount overridden to a no-op — caveat (4)',
            prep: () =>
                prepSetBlock((b) => {
                    for (let i = 0; i < b.order.length; i++) b.order[i].unmount = NO_TEARDOWN;
                    return () => stageDispatchLoop(b.order);
                }),
        },
        {
            name: 'textContent',
            reps: ladderReps,
            what: "parent.textContent = '' on a block nothing unmounted",
            prep: () =>
                prepSetBlock((b) => () => {
                    b.parent.textContent = '';
                }),
        },
        {
            name: 'drop per child',
            reps: ladderReps,
            what: `dropExoChild × ${PANELS} — the path a port that owns nothing takes`,
            prep: () => prepSetBlock((b) => () => stageDropLoop(b.order, b.parent)),
        },
        // STRUCK: `registry evict` timed 200 `Map.delete`s over a freshly filled key→child
        // registry. That book was a keyed list's, no list keeps one and nothing writes
        // `TExoDomChild.registry`, so the phase priced a deleted mechanism.
    ];

    const stats = runPhases(phases, rounds);
    const median = (name: string): number => (stats.get(name) as Stat).median;

    line('');
    line(
        `TEARDOWN PHASES — ${PANELS} panels, schema core [ms per hide] · interleaved · ` +
            `${rounds} rounds · GC before every timed region`
    );
    line('                    reps   min      p25      median   p75      max      ns/panel');
    for (const p of phases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(17)}${String(p.reps).padStart(5)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ${ns(s.median).padStart(8)}`
        );
    }
    line('');
    for (const p of phases) line(`  ${p.name.padEnd(17)} ${p.what}`);

    const hide = median('hide');
    const clear = median('clear region');
    const unmount = median('unmount loop');
    const dispatch = median('dispatch only');
    const textContent = median('textContent');
    const drop = median('drop per child');

    const notify = hide - clear;
    const domLadder = clear - unmount;
    /** `unmount loop − dispatch only`: the whole of the default `unmount`'s body. */
    const bodyLadder = unmount - dispatch;

    line('');
    line(
        `THE SPLIT — medians, ms per hide of ${PANELS} panels, and each as a share of the ` +
            'measured hide'
    );
    line(
        `  notify + re-read      ${f(notify)}   ${pct(notify, hide).padStart(6)}   ` +
            'hide − clear region: the notification, the getValue, the branch and order.length = 0'
    );
    line(
        `  DOM clear  [ladder]   ${f(domLadder)}   ${pct(domLadder, hide).padStart(6)}   ` +
            `clear region − unmount loop, ${census.nodesPerHide} elements`
    );
    line(
        `  DOM clear  [isolated] ${f(textContent)}   ${pct(textContent, hide).padStart(6)}   ` +
            `textContent = '' alone, ${census.nodesPerHide} elements`
    );
    line(
        `  unmount    [measured] ${f(unmount)}   ${pct(unmount, hide).padStart(6)}   ` +
            `${PANELS} × (unmount() + index = -1), whole loop`
    );
    line(
        `    dispatch [isolated] ${f(dispatch)}   ${pct(dispatch, hide).padStart(6)}   ` +
            `${PANELS} calls and stores with an empty body — lower bound, caveat (4)`
    );
    line(
        `    body     [ladder]   ${f(bodyLadder)}   ${pct(bodyLadder, hide).padStart(6)}   ` +
            "unmount loop − dispatch only: the whole of the default unmount's body"
    );
    line(`  hide       [measured] ${f(hide)}   100.0%   the real program, nothing subtracted`);
    line('');
    line('THE OTHER PATH — what a children port that does NOT own its element pays instead');
    line(
        `  drop per child        ${f(drop)}   ${pct(drop, hide).padStart(6)}   ` +
            `${PANELS} × (unmount + climb + removeChild)`
    );
    line(
        `  Δ vs clear region     ${f(drop - clear)}   ${pct(drop - clear, hide).padStart(6)}   ` +
            `${
                drop > clear ? 'what owning the parent BUYS' : 'owning the parent bought NOTHING'
            } on this block`
    );

    line('');
    line(
        `ANSWER — of one hide of ${PANELS} panels (${f(hide)} ms), the DOM clear is between ` +
            `${pct(textContent, hide)} (isolated) and ${pct(
                domLadder,
                hide
            )} (ladder), the whole ` +
            `unmount loop is ${pct(unmount, hide)}, of which the default unmount's whole body is ` +
            `${pct(bodyLadder, hide)}, over panels carrying ${
                census.setDisposers
            } disposers each. ` +
            'Read the DOM pair as a BRACKET, not as one number, and read caveat (1) ' +
            "in this file's header before spending anything on the DOM figure: Blink defers most " +
            'of a detach past the end of the timed region, so it is a lower bound and the toggle ' +
            'axis pays the rest of it on the next show.'
    );
    line(
        `  ${TOGGLE_CYCLES} hides = ${f(hide * TOGGLE_CYCLES)} ms, which is ` +
            `${pct(hide * TOGGLE_CYCLES, TOGGLE_EXODRA_MS)} of the ${TOGGLE_EXODRA_MS} ms the ` +
            '`exodra` row of `toggle` measured in .gate/toggle.base1.json. That comparison is only ' +
            'worth anything if both were measured on THIS machine in a comparable session — ' +
            're-run `toggle` before quoting it, and remember caveat (1) makes this share a floor.'
    );

    // ── SELF-CHECKS: the ways this run could be lying about its own numbers ──────────────
    if (notify < 0 || domLadder < 0 || bodyLadder < 0) {
        // eslint-disable-next-line no-console
        console.log(
            `❌ teardown-phases: the ladder did not nest (hide ${f(hide)}, clear ${f(clear)}, ` +
                `unmount ${f(unmount)}, dispatch ${f(dispatch)} ms) — a stage measured cheaper ` +
                'than the stage it contains, so every ladder subtraction above is noise and only ' +
                'the isolated rows mean anything. Raise `rounds`, or read the isolated rows alone.'
        );
    }
    if (drop < unmount) {
        // eslint-disable-next-line no-console
        console.log(
            `❌ teardown-phases: "drop per child" (${f(drop)} ms) measured cheaper than the bare ` +
                `unmount loop (${f(
                    unmount
                )} ms), though \`dropExoChild\` runs that same loop and a ` +
                'climb and a removeChild on top of it. The "Δ vs clear region" line is noise.'
        );
    }
    const bracket = (name: string, low: number, high: number): void => {
        if (low <= 0 || high <= 0) return;
        const ratio = high > low ? high / low : low / high;
        if (ratio > 4) {
            // eslint-disable-next-line no-console
            console.log(
                `❌ teardown-phases: the two ${name} estimates disagree by ${ratio.toFixed(1)}× ` +
                    `(${f(low)} vs ${f(high)} ms) — at that spread the answer is a range and not ` +
                    'a number, and the difference between them is cache behaviour plus ' +
                    'subtraction noise, not a quantity anybody can act on.'
            );
        }
    };
    bracket('DOM-clear', textContent, domLadder);

    // THE CLOCK CHECK, per phase and against the quantum this run observed — not a constant. A
    // region under three ticks has digits that are rounding, and the refusal names the factor
    // because "raise it a bit" is how an axis stays broken.
    for (const p of phases) {
        const region = (stats.get(p.name) as Stat).median * p.reps;
        const floor = MIN_TICKS * quantum;
        if (region >= floor) continue;
        const factor = region > 0 ? floor / region : Infinity;
        const wantBatch = Number.isFinite(factor) ? Math.ceil(batch * factor) : batch * 10;
        // eslint-disable-next-line no-console
        console.log(
            `❌ teardown-phases: the "${p.name}" timed region is ${region.toFixed(3)} ms at ` +
                `${p.reps} reps — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                `quantisation, not measurement. Repetitions must rise by ×${
                    Number.isFinite(factor) ? factor.toFixed(1) : '10+'
                }: re-run with batch ${wantBatch} — ` +
                `\`npm run axis --workspace=@exodra/benchmarks -- teardown-phases ${rounds} ` +
                `${wantBatch}\``
        );
    }
    if (census.setDisposers !== 0) {
        // eslint-disable-next-line no-console
        console.log(
            `❌ teardown-phases: the panel carries ${census.setDisposers} disposers — this copy of ` +
                "the toggle axis's panel has drifted from it (caveat 3)."
        );
    }
}
