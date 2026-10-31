// AXIS 5 — APP UPDATE ("fat update"): a BATCH of real interactions on the mounted
// todo app (THE app initial-render mounts). Per round the batch toggles every card's details
// AND advances every card's dynamic tag list. See todo-app.tsx for the fairness
// notes (declarative tag reconcile with node reuse, no imperative list, React flushSync).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE EVENT IS GONE FROM THE TIMED REGION, AND THAT IS THE BIGGEST CHANGE THIS AXIS HAS EVER HAD
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// FOR ITS WHOLE LIFE THIS AXIS DROVE ITS PARTICIPANTS WITH `clickAll` — 160 real `MouseEvent`s
// built and dispatched per round. A V8 CPU profile of this very scene, taken by the owner with
// `scripts/profile-app.mjs 300 direct update` and again with `… machine update` and aggregated by
// SELF TIME, put the harness at the top of both profiles and no renderer anywhere near it:
//
//       direct                          machine
//       29.2%  dispatchEvent (native)   27.0%  dispatchEvent (native)
//       20.5%  clickAll @ todo-spec.ts  20.7%  clickAll @ todo-spec.ts
//       11.8%  MouseEvent (native)      13.2%  MouseEvent (native)
//        6.0%  cloneNode                 4.1%  cloneNode
//        4.0%  setExoText                   3.3%  setExoText
//
// ~61% OF EVERY NUMBER THIS AXIS PUBLISHED WAS THE BROWSER DELIVERING EVENTS. That work is
// IDENTICAL FOR EVERY PARTICIPANT, so it could rank nobody: it inflated every row by the same
// absolute amount, deflated every ratio, and — because scatter grows with the work a region does —
// it set the scatter the null pair used to report as this axis's RESOLUTION FLOOR. The last
// recording (`.gate/app-update.latest.json`) resolved 0.120 ms on rows around 5 ms, and `sinuous`
// 6.92 and `solid` 6.98 sit 0.060 apart in it: TWELVE of its seventeen rows lay in chains whose
// every adjacent gap was inside that floor. Those rows the axis ranked and did not measure.
//
// SO THE ROUND IS NOW RUN BY CALLING EACH CARD'S OWN TWO HANDLERS DIRECTLY, in document order,
// with no event of any kind: every card's `.tog` handler, then every card's `.addtag` handler, then
// the participant's own commit — the same two passes, in the same order, that `flip`'s two
// `clickAll` calls made. See `card-driver.ts` for the registry and `TCardDriver.round`.
//
// ═══ WHAT THIS AXIS NO LONGER MEASURES, NAMED AS A GAP RATHER THAN LEFT TO BE DISCOVERED ═══
//
// HOW A FRAMEWORK ATTACHES OR DELEGATES ITS HANDLERS IS NOT MEASURED HERE, AND IT IS NOT MEASURED
// ANYWHERE ELSE IN THIS SUITE EITHER. The participants genuinely differ: Solid's compiler emits
// `delegateEvents(["click"])` and dispatches through one document-level listener, Marko installs a
// document listener of its own, `mikado` here runs ONE delegated listener that reads `e.target`,
// climbs to the card node and branches on `className`, while `stage0`, lit, uhtml, sinuous and the
// Exodra rows attach per node. Under a dispatched click each of those paths is walked; under a
// direct call none of them is.
//
// THAT COST IS PAID AT THE MOUNT (attaching, or registering the delegate) AND IN THE BUBBLE WALK,
// AND IT IS NOT UPDATE WORK. If it is worth a number it deserves its own scene, and until that
// scene exists this suite has NO number for it. Nobody may read the table below as covering it.
//
// TWO SMALLER THINGS LEFT WITH IT, for completeness: the two `querySelectorAll` calls per round
// (harness, not renderer) and `mikado`'s target resolution, which lived in its delegated listener
// rather than in a per-card closure — see `apps/mikado/mikado.tsx`, where the listener's body
// was split into the two functions the driver calls and the climb was left behind in the listener.
//
// ═══ `clickAll` HAS NOT LEFT THIS FILE — IT LEFT THE CLOCK ═══
//
// The gates below still dispatch real events, and they are the reason the change is checkable
// rather than asserted: `gateDriveEqualsClick` mounts the reference app TWICE and drives one copy
// with 160 dispatched clicks and the other through the registry, diffing the markup after every one
// of four rounds. If calling the handler were not what a click does, that gate fails. No timed
// region in this file contains an event.
//
// ═══ ONE PARTICIPANT IS GONE, BY NAME, AND IT IS NOT A JUDGEMENT ON IT ═══
//
// `marko` CANNOT BE ADVANCED WITHOUT A REAL EVENT, and this repository established why before this
// change: a mounted Marko template's entire outside surface is `update(input)`, `destroy()` and the
// `value` accessor. `MkToggle.marko`'s own header says it in as many words — "Marko cannot export
// an instance method the way `SvToggle.svelte` exports `setRows`" — and `MkReactive.marko`'s adds
// "there is no `signal()` a caller can create in plain JS, keep a thousand of, and write". A card's
// `<let/open>` and its `onClick` body are inside the compiled template and nothing reaches them.
//
// WHAT WAS AVAILABLE AND WAS DECLINED: lifting `open`/`count` out of the card into `CardsDyn.marko`
// and pushing them down as input with `valueChange`. That is Marko's controlled-state idiom and it
// WOULD be drivable through `instance.update(...)` — and it is a DIFFERENT PROGRAM from the one
// every other participant runs and from the one `initial-render` mounts, so it would be a new
// participant wearing an old row's name. Declining it is the same rule that keeps every other row
// on its own framework's idiom.
//
// SO MARKO IS NOT IN THE TABLE. It is still built, still gated by `svelte-marko-gate.ts` and still
// measured on `exodra-app-update`, which is click-fired. A reader who wants Marko's update number
// takes it from there and does not paste it beside a row from here.
//
// ═══ THE BATCH — WHY A TIMED REGION IS MANY ROUNDS, AND HOW MANY ═══
//
// See `DEFAULT_BATCH` below for the arithmetic. The short version: the round got ~2.5× cheaper when
// the events left, so the region has to get longer or the clock's 0.1 ms quantum becomes a
// noticeable share of it. The THIRD POSITIONAL of `scripts/run-one-axis.js` is that count — ROUNDS
// PER TIMED REGION, not `abBench`'s scenario batch, which stays 1 so that one app stands at a time
// and every round after the first updates an app that is already warm.
//
// ═══ THIS AXIS HAS NO NULL PAIR, SO NOTHING IT PRINTS IS READABLE AS A SIZE ═══
//
// IT USED TO HAVE ONE, and losing it is the price of cutting the Exodra field to two rows. The pair
// was `exodra` ↔ `exodra·twin`: the BINDABLE app — a cell per card per varying thing, `c.bindList`
// for the details block and for the tag list, a click writing a cell — and a SECOND, SEPARATELY
// DECLARED copy of it inside this file, own `createExoMachineBuilder` calls, own declarations, own compiled
// schemas, own backend, so that its true difference from the row it bounded was ZERO BY CONSTRUCTION.
// What the run returned between the two was what this instrument returns when nothing is there, and
// it was printed after the table as the RESOLUTION FLOOR that every gap was read against.
//
// BOTH HALVES WENT TOGETHER, because a twin of a row that is not in the table bounds nothing. So
// this axis now RANKS and does not MEASURE: `reportOrderings` says so by name before it prints a
// single comparison, and four judgements went with the floor — P·MACHINE·SPLIT, P·INLINE and the
// P·DISPATCH pair, each of which needed either a floor or a third and fourth Exodra row.
//
// GETTING IT BACK IS A DECISION AND NOT A CLEANUP: it means declaring a twin of `exodraDirect` or
// of `exodraMachine` — a second ~380-line program, not a rename — and adding a thirteenth
// participant to every round, which lengthens the round for every other row in the table.
//
// ═══ TWO EXODRA ROWS: THE WIRE AND THE STATE MACHINE ═══
//
// `exodraDirect` is the WIRE row — what this renderer's public API reaches with no reactive layer
// at all: the two children ports are held as REGIONS (`c.childList`) and the card's own handlers
// command them, one `insert` or one `remove` for the details block, and for the tag list exactly
// the rows that joined or left.
//
// WHAT MAKES IT FAIR, in one line, because this suite has been burned by the opposite: it is handed
// exactly what every other row is handed — one call of its own `.tog` handler and one of its own
// `.addtag` handler per card, through the same driver — and it derives everything it writes from
// its own `count`/`open` inside the clock. Nothing tells it which fields changed. What it does
// differently is that it does not throw the delta away and rediscover it: `stage0`, through
// `stage0/reconcile`, allocates the new tag array and diffs it, where this one knows the list is a
// prefix of `POOL` and that `count` moved. Every participant's handler holds the same `count`; what
// differs is that this renderer offers a way to SAY it. The full argument, and what this row gives
// up for it, are in `apps/exodra/exodra.md`.
//
// `exodraMachine` IS THE STATE MACHINE ROW. The machine in `@exodra/core/src/machine/` had never
// been measured against a competitor — it appeared in two files, both belonging to
// `machine-vs-cells`, so every number for it compared it against another spelling of our own
// library.
//
// THE CAPTION HAS CHANGED BECAUSE THE ROW HAS. It used to read "THE MACHINE CANNOT EXPRESS CHILDREN
// … so this row is NOT the app on the machine" — a derivation writes a VALUE and no children call
// takes one, so the row was a WIRE with a machine inside it, with props and an instance index and
// both children ports built by hand. `m.fill([deps], (c) => void)` removed that limit, and the card
// is now a MACHINE: no props, no index, its state moved off its declared start by one TRANSITION
// per card, four derivations, TWO FILLS driving the two children ports, and both clicks reaching
// declared transitions. Its regions and its commands are still `exodraDirect`'s, so what differs
// between the two rows is one thing: whether a click dispatches through a compiled program or
// through two closures that already know what moved.
//
// ON AN UPDATE AXIS THAT MEANS SOMETHING SPECIFIC: this app used to have no reactive scalar at all,
// so the machine's derivations ran at the mount and never again and its update column priced a
// transition around a state change nothing downstream consumed. The app now carries THREE DERIVED
// VALUES (see the markup contract in `apps/exodra/exodra.tsx`), `open` is read by two of the
// machine's derivations and `count` by one, so a click's transition wakes real work — and the
// state's OTHER consumer, the CHILDREN PORT, is a slot of the same program since `m.fill` arrived,
// so a `.tog` transition wakes THREE slots (the headline, `aria-expanded`, the details fill) and an
// `.addtag` transition wakes TWO. NO DIRECTION IS PREDICTED for it; see P·UPDATE below the table,
// which now PRINTS that pair and no longer judges it.
//
// AND A ROW THIS AXIS NO LONGER HAS: `exodraBanked` — the bindable row with a node-bank pack
// composed under it. It re-declared no app at all; it rendered that app's very own `APP` value
// through a second backend, so it went when that app left the benches. The pack itself is gone from
// the tree as well, so there is nothing to re-point it at.
//
// THE ASYMMETRY IT EXISTED TO CLOSE IS BACK, AND IT IS NAMED RATHER THAN LEFT TO BE FOUND. Every
// Exodra participant here constructs a BARE backend (`new ExoDomBackend()`, no packs composed at
// all) while `mikado` beside them is deliberately tuned — `new Mikado(TAG, { pool: true, cache:
// true })`, which its own file annotates as "the three settings Mikado's own best practices name
// for a keyed list". So Mikado RECYCLES the tags a shrinking list drops and we CLONE fresh ones,
// on an axis whose whole update is a tag list cycling 1→2→3→4→1 per card per round. No row in this
// table composes the strategy that would answer that.
import { loadMounts, el, type AppHandle } from '../../participants/bundled/todo-app';
import { mountExodraApp } from '../../participants/exodra/app';
// LIT AND MIKADO, for the reason `initial-render.tsx` states: both were implemented and never
// registered here, so the axis a reader is most likely to quote had never compared Exodra
// against either. Same participants `exodra-app-update` runs, same app, same gates.
import { mountLitApp, verifyLitApp } from '../../participants/lit/app';
import { mountMikadoApp, verifyMikadoApp } from '../../participants/mikado/app';
// THE THREE CLOSEST ARCHITECTURAL RELATIVES — stage0 (the ceiling: clone, keep the references,
// write, with nothing on top), uhtml (the `parts` model reaching each hole by a recorded path)
// and sinuous (template plus fine-grained reactivity, with no prepared template at all). The
// case for each is in its own file's header and in `initial-render.tsx`, which mounts the same
// three apps this axis then updates.
//
// WHAT EACH ONE'S UPDATE ROUND ACTUALLY IS, because on THIS axis that is the whole row:
//   stage0  — the handler writes the DOM itself: a clone inserted or a node removed for the
//             details block, and `stage0/reconcile` handed the new tag array. No dispatch at all.
//   uhtml   — the handler writes a signal; the card's COMPONENT effect re-runs, allocates one
//             `Hole` and diffs it against the live one. Per-card granularity, the same shape
//             `apps/lit/lit.tsx` gets from a render root per card.
//   sinuous — the handler writes an observable; the one function child subscribed to it re-runs,
//             and `map()` reconciles the tag list. Per-position granularity.
import { mountStage0App, verifyStage0App } from '../../participants/stage0/app';
import { mountUhtmlApp, verifyUhtmlApp } from '../../participants/uhtml/app';
import { mountSinuousApp, verifySinuousApp } from '../../participants/sinuous/app';
// THE FIVE `loadMounts()` PARTICIPANTS' GATES. Svelte, Marko, Solid, React and voby come from
// `loadMounts()` and had no markup gate on either axis until these two files existed — only
// `scripts/verify-structure.mjs`, which counts elements ONCE, at the mount, and therefore cannot
// see a text node and cannot see an update at all. On an UPDATE axis that hole is worse than on a
// mount one: a conditional block or a keyed list that reinserted at the wrong end leaves the count
// intact and the bytes different, and a derived value that stopped recomputing leaves the count
// intact too. Both files gate the `loadMounts()` entry this axis times, and both call the one diff
// loop in `svelte-marko-gate.ts`. See `solid-react-voby-gate.ts` for the stage-count argument.
// `verifyMarkoApp` IS NOT IMPORTED and Marko is not a participant here — see THE ONE PARTICIPANT
// THAT IS GONE at the top of this file. It is still gated on `exodra-app-update`, which is still
// click-fired, and `svelte-marko-gate.ts` is unchanged.
import { verifySvelteApp } from '../../gates/svelte-marko-gate';
import {
    verifySolidApp,
    verifyReactApp,
    verifyPreactApp,
    verifyMillionApp,
    verifyVobyApp,
} from '../../gates/solid-react-voby-gate';
// THE DRIVER FLOOR, NOT THE CLICK FLOOR. `clickFloorMount` prices two `querySelectorAll`s and 160
// dispatches over inert markup, which is the harness this axis no longer runs;
// `directFloorMount` prices the one it does — two loops of 80 and 160 calls into a closure that
// returns. See `participants/floor/app.ts`, which carries both and says which axis each belongs to.
import { directFloorMount } from '../../participants/floor/app';
import { abBench, type AbRow, type Scenario } from '../../../harness';
import { appLines } from '../../shared/app-lines';
import { collectCardOps, cardDriverOver, type TCardDriver } from '../../shared/card-driver';
import { IDX, POOL, DECK_IDX, DECK_TITLES } from '../../shared/todo-spec';
import { gateMarkup, markupOf } from '../../gates/markup-gate';

/** The app's card count, and therefore the pair count every participant must register. */
const CARDS = IDX.length;

/** The app's deck count, and therefore the rename count every participant must register. */
const DECKS = DECK_IDX.length;

/**
 * HOW MANY UPDATE ROUNDS ARE INSIDE ONE TIMED REGION — the third positional of
 * `scripts/run-one-axis.js`, and NOT `abBench`'s scenario batch, which this axis pins at 1.
 *
 * ═══ THE ARITHMETIC, FROM THE LAST CLICKED RECORDING AND THE PROFILE ═══
 *
 *   `.gate/app-update.latest.json`, `exodra`      5.48 ms per region of 5 rounds = 1.096 ms/round
 *   the owner's profile of this scene              ~61% of that is MouseEvent + dispatchEvent
 *                                                  + `clickAll`, all of it harness
 *   what is left when the events go                ~0.43 ms per round for the fastest rows
 *   the clock, observed (`observeTimerQuantum`)    0.100 ms, and `abBench` batch 1 means the
 *                                                  REGION is what gets quantised, not the round
 *
 * At N rounds per region the per-ROUND grid is `0.100 / N`. The floor this axis has to stay well
 * under is its own resolution, which the clicked recording put at 0.120 ms per 5-round region
 * = 0.024 ms per round; a quantisation term that is a large share of THAT would put the clock back
 * inside the answer:
 *
 *   N = 5    grid 0.0200 ms/round   83% of the old per-round resolution   useless
 *   N = 20   grid 0.0050 ms/round   21%                                   marginal
 *   N = 40   grid 0.0025 ms/round   10%                                   chosen
 *
 * AND N IS A MULTIPLE OF FOUR ON PURPOSE. `open` has period 2 and `count` cycles 1→2→3→4→1, so the
 * app returns to its mounted state every 4 rounds. A region of 40 is exactly ten whole cycles: it
 * ends where it began, every region measures the same mixture of list growths and shrinks, and the
 * per-round figure means the same thing at any N. A region of 5 would end mid-cycle and weight the
 * cheap transitions differently from the dear ones. `benchmarkAppUpdate` rounds a bad N UP to the
 * next multiple of four and says so.
 *
 * WHAT IT COSTS: the region is ~40× a round rather than 5×, and the untimed mount is paid once per
 * SAMPLE instead of five times, so a run is roughly twice the wall clock of the old batch-5 one.
 *
 * IT IS THE AXIS'S OWN DEFAULT AND NOT THE RUNNER'S, and that is the trap `list-update` already
 * documents: `scripts/run-one-axis.js` defaults its third positional to 1 for every axis, so
 * `app-update 100` — rounds given, batch omitted — hands this axis ONE round per region and puts it
 * back on the clamp. `reportScale` refuses that run by name and prints the N that would clear it.
 */
const DEFAULT_BATCH = 40;

/** How many observed quanta the fastest RENDERER row's region must clear to be worth reading. */
const MIN_TICKS = 10;

type Mount = (c: HTMLElement) => AppHandle;

/**
 * ONE MOUNTED PARTICIPANT, CALLED DIRECTLY — what `prep` builds and every gate addresses.
 */
interface TDirect {
    readonly driver: TCardDriver;
    readonly teardown: () => void;
}

/**
 * MOUNT A PARTICIPANT WITH A COLLECTION OPEN, and build the driver over the pairs it declared.
 *
 * THE PAIR COUNT IS CHECKED HERE AND THE CHECK THROWS. A participant that registered nothing would
 * otherwise produce a driver whose `round()` does nothing at all — the fastest row in the table,
 * for the reason a benchmark is least able to notice. A participant that registered twice per card
 * would double the round. Both are one comparison away and neither is left to a later gate.
 */
function drive(who: string, make: Mount, container: HTMLElement): TDirect {
    const { value: app, ops, decks, rounds } = collectCardOps(() => make(container));
    if (ops.length !== CARDS) {
        throw new Error(
            `app-update: \`${who}\` registered ${ops.length} handler pairs with \`card-driver\` ` +
                `and the app has ${CARDS} cards. A row fired through the wrong number of pairs ` +
                'is not the app; see `noteCardOps` in that participant.'
        );
    }
    // AND ONE RENAME PER DECK — the third level's whole contribution to a round, and the same
    // check for the same reason as the pairs above. A row that registered none would run a round
    // that never touches a `<h2>`: ten writes short of the app, and short in exactly the direction
    // that prints as a faster row. `decks` is a list and not a single closure because a rename IS
    // addressable — by a deck index — which is what lets `gateAddressing` drive rename `k` alone.
    if (decks.length !== DECKS) {
        throw new Error(
            `app-update: \`${who}\` registered ${decks.length} deck renames with \`card-driver\` ` +
                `and the app has ${DECKS} decks. A row fired without them never moves the third ` +
                'level; see `noteDeckOps` in that participant.'
        );
    }
    // AND EXACTLY ONE ROUND OPERATION — the user-setting write, which is a third of what a round
    // does and is the only part of it no card owns. A participant that registers none produces a
    // called round in which forty tags never move: the same markup the clicked path produces MINUS
    // one write, on a row that would print as the fastest in the table. Same shape as the check
    // above and for the same reason — see `noteRoundOp` in `card-driver.ts`.
    if (rounds.length !== 1) {
        throw new Error(
            `app-update: \`${who}\` registered ${rounds.length} round operations with ` +
                '`card-driver` and a round has exactly one — the advance of ' +
                "`roundUserOf(round++)`'s setting. A row fired without it never moves a shared " +
                'value and is not the app; see `noteRoundOp` in that participant.'
        );
    }
    return { driver: cardDriverOver(ops, decks, rounds, app.commit), teardown: app.teardown };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE TWO GATES THE DIRECT DRIVE NEEDED, RUN BEFORE ANYTHING IS TIMED
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Everything this axis published before was produced by a dispatched click, so the whole change
// rests on one claim — CALLING THE HANDLER IS WHAT A CLICK DOES — and on one hazard the markup diff
// alone cannot see: an op array in the wrong order, or one card's pair registered twice while
// another's is missing. A round drives every card either way, so the FINAL markup is identical
// under both faults. The two gates below are aimed at exactly those two things.

/** How many rounds each gate runs. FOUR, because the tag list's cycle is 1→2→3→4→1: three rounds
 *  would never test the wrap, which is the shape a keyed reconcile gets wrong. */
const GATE_ROUNDS = 4;

/**
 * GATE 1 — THE DIRECT DRIVE PRODUCES THE BYTES A DISPATCHED CLICK PRODUCES.
 *
 * Two mounts of the SAME participant, side by side: one flipped with `clickAll` (the harness this
 * axis used to time), one called through `card-driver`. Diffed at the mount and after each of four
 * rounds. It is run for every participant, and for the reference app it is the whole justification
 * for the change.
 *
 * A DIFF AFTER EVERY ROUND AND NOT AT THE END, because four rounds return the app to its mounted
 * state (`open` has period 2, `count` period 4) and an end-state check would pass a driver that
 * did nothing at all.
 */
function gateDriveEqualsClick(who: string, make: Mount): void {
    const clickedC = el();
    const directC = el();
    const clicked = make(clickedC);
    const called = drive(who, make, directC);
    try {
        gateMarkup('app-update', 'mount', `${who} called vs clicked`, clickedC, directC);
        for (let r = 1; r <= GATE_ROUNDS; r++) {
            clicked.flip();
            called.driver.round();
            gateMarkup(
                'app-update',
                `${r} click-round vs ${r} called round`,
                `${who} called vs clicked`,
                clickedC,
                directC
            );
        }
    } finally {
        clicked.teardown();
        clickedC.remove();
        called.teardown();
        directC.remove();
    }
}

/**
 * GATE 2 — OP `k` DRIVES CARD `k`, RENAME `k` DRIVES DECK `k`, AND NOTHING ELSE MOVES.
 *
 * The order the ops were registered in is what makes a called round the same round `clickAll`
 * runs (document order, all `.ren`, then all `.tog`, then all `.addtag`), and NOTHING about the
 * final markup depends on it — so the diff above cannot check it and this has to. For every deck it
 * snapshots the ten `<h2>` texts, and for every card one attribute (`aria-expanded`) or one text
 * (`.count`) across all 80 cards, drives ONE op, and requires the set of changed indices to be
 * exactly `{k}`.
 *
 * IT ALSO CATCHES ALIASING, which is the failure a per-instance compute table can produce: card 7's
 * op writing card 8's headline leaves the right number of changes and the wrong index.
 *
 * IT RESTORES AS IT GOES — `tog` twice returns `open`, `addTag` four times returns `count` — and
 * the app's markup is diffed against a freshly mounted one at the end, so a gate that left the
 * subject dirty would fail here rather than in the next gate's noise.
 */
function gateAddressing(who: string, make: Mount): void {
    const c = el();
    const app = drive(who, make, c);
    try {
        const read = (sel: string, attr: string | null): string[] => {
            const nodes = c.querySelectorAll(sel);
            const out: string[] = new Array<string>(nodes.length);
            for (let k = 0; k < nodes.length; k++) {
                out[k] = (attr === null ? nodes[k].textContent : nodes[k].getAttribute(attr)) ?? '';
            }
            return out;
        };
        const changed = (before: readonly string[], after: readonly string[]): number[] => {
            const moved: number[] = [];
            for (let k = 0; k < before.length; k++) if (before[k] !== after[k]) moved.push(k);
            return moved;
        };
        const demand = (op: string, k: number, moved: readonly number[]): void => {
            if (moved.length === 1 && moved[0] === k) return;
            throw new Error(
                `app-update: ${who}'s registered pair ${k} drove ` +
                    (moved.length === 0
                        ? 'NOTHING'
                        : `card(s) ${moved.join(', ')} instead of card ${k}`) +
                    ` on \`${op}\`. The handlers are registered in the wrong order, or one card's ` +
                    "pair is registered twice and another's not at all — either way a called " +
                    'round is not the round `clickAll` runs. See `noteCardOps` in the participant.'
            );
        };

        // THE DECK LEVEL FIRST, AND IT IS THE ONE ADDRESS THAT COULD NOT EXIST BEFORE. A rename
        // moves a `<h2>` that stands OUTSIDE every card and is shared by the eight cards under it,
        // so a participant that hung its rename on the first card of the deck — the obvious way to
        // reach it from a flat loop — would move exactly one `<h2>` and pass every byte diff in
        // this file. What it would NOT survive is being fired ALONE: the card whose pair was
        // carrying the rename moves too.
        //
        // IT RESTORES BY RENAMING FOUR TIMES, the length of `DECK_TITLES`, exactly as the tag count
        // is restored by advancing it `POOL.length` times.
        for (let k = 0; k < DECKS; k++) {
            const before = read('.deck > h2', null);
            app.driver.rename(k);
            const moved = changed(before, read('.deck > h2', null));
            if (moved.length !== 1 || moved[0] !== k) {
                throw new Error(
                    `app-update: ${who}'s registered rename ${k} drove ` +
                        (moved.length === 0
                            ? 'NOTHING'
                            : `deck(s) ${moved.join(', ')} instead of deck ${k}`) +
                        ". The renames are registered in the wrong order, or one deck's rename is " +
                        "registered twice and another's not at all — either way a called round is " +
                        'not the round `clickAll` runs. See `noteDeckOps` in the participant.'
                );
            }
            for (let n = 1; n < DECK_TITLES.length; n++) app.driver.rename(k);
        }

        for (let k = 0; k < CARDS; k++) {
            const before = read('.tog', 'aria-expanded');
            app.driver.tog(k);
            demand('tog', k, changed(before, read('.tog', 'aria-expanded')));
            app.driver.tog(k);
        }
        for (let k = 0; k < CARDS; k++) {
            const before = read('.count', null);
            app.driver.addTag(k);
            demand('addTag', k, changed(before, read('.count', null)));
            for (let n = 1; n < POOL.length; n++) app.driver.addTag(k);
        }

        // AND IT PUT EVERYTHING BACK. A gate that restores by arithmetic rather than by checking is
        // a gate that trusts the arithmetic it was written to test.
        const fresh = el();
        const ref = make(fresh);
        try {
            gateMarkup('app-update', 'after the address gate', `${who} restored`, fresh, c);
        } finally {
            ref.teardown();
            fresh.remove();
        }
    } finally {
        app.teardown();
        c.remove();
    }
}

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
/** Printed, not thrown — the shape every axis here uses, so the runner records it as a refusal. */
// eslint-disable-next-line no-console
const refuseLine = (s: string): void => console.log(`❌ ${s}`);

/**
 * THE CLOCK'S REAL RESOLUTION, observed rather than assumed — `toggle.tsx`'s function verbatim, in
 * this file for the first time because until now this axis never looked at the clock at all.
 * `.gate/app-update.latest.json` records `"quantum": null`, which is exactly what an axis that does
 * not print the phrase `scripts/run-one-axis.js` scrapes leaves behind.
 *
 * HOW: spin until the clock actually moves and keep the smallest step it ever takes. Anything
 * smaller than the true quantum is impossible to observe; anything larger only appears when the
 * loop was descheduled, which is why the MINIMUM over many tries is the answer.
 */
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

/**
 * IS THIS TABLE A MEASUREMENT OR THE CLAMP — `list-update`'s `reportScale`, with two differences
 * this axis needs.
 *
 * (1) THE REGION IS QUANTISED, NOT THE ROUND. `abBench` runs at batch 1 here, so the clock is read
 *     once around a region of `regionRounds` rounds; the per-ROUND grid is therefore
 *     `quantum / regionRounds` and the region itself is judged against the raw quantum.
 * (2) THE ROW IT JUDGES IS THE FASTEST RENDERER, NOT THE FASTEST ROW. `driver` is 160 calls into a
 *     closure that returns and is EXPECTED to sit on the clamp — that is the finding, not a fault —
 *     so judging it would refuse every table this axis will ever print. It is excluded by name and
 *     reported separately as an upper bound.
 */
function reportScale(rows: readonly AbRow[], quantum: number, regionRounds: number): void {
    line('');
    const field = rows.filter((r) => r.name !== 'driver');
    if (field.length === 0) {
        refuseLine('scale app-update: no renderer row in the table above, so nothing is judged');
        return;
    }
    const fastest = field[0];
    const perRound = quantum / regionRounds;
    const ticks = fastest.stat.median / quantum;
    const bound = rows.find((r) => r.name === 'driver');
    if (bound !== undefined) {
        line(
            `  THE INSTRUMENT'S OWN LOAD: \`driver\` — 160 calls into a no-op closure over inert ` +
                `markup — measured ${bound.stat.median.toFixed(3)} ms per region, which is ` +
                `${(bound.stat.median / quantum).toFixed(
                    1
                )} tick(s) of the observed clock and is ` +
                'therefore an UPPER BOUND and not a measurement. Against the fastest renderer row ' +
                `(${fastest.name} ${fastest.stat.median.toFixed(3)}) that is at most ` +
                `${((bound.stat.median / fastest.stat.median) * 100).toFixed(1)}% of a row. The ` +
                'click harness this axis used to run was ~61% (see the header).'
        );
    }
    if (ticks >= MIN_TICKS) {
        line(
            `scale app-update: fastest renderer row \`${fastest.name}\` region ` +
                `${fastest.stat.median.toFixed(3)} ms = ${ticks.toFixed(1)}× the observed timer ` +
                `quantum (${quantum.toFixed(
                    3
                )} ms) — above the ${MIN_TICKS}× floor. Per ROUND the ` +
                `grid is ${perRound.toFixed(4)} ms (${quantum.toFixed(3)} over ${regionRounds} ` +
                'rounds in the region), so the ordering in the table above is resolvable.'
        );
        return;
    }
    const wantRounds =
        ticks > 0 ? Math.ceil((regionRounds * MIN_TICKS) / ticks) : regionRounds * 40;
    refuseLine(
        'scale app-update: UNDER-SCALED, AND THIS TABLE IS NOT A RANKING. Fastest renderer row ' +
            `\`${fastest.name}\` region ${fastest.stat.median.toFixed(3)} ms = ` +
            `${ticks.toFixed(1)}× the observed timer quantum (${quantum.toFixed(3)} ms), against ` +
            `a floor of ${MIN_TICKS}×. A row sitting on the clamp is zero, one or two TICKS, so ` +
            'every ratio printed above it has a denominator of one tick and MUST NOT BE QUOTED. ' +
            `Re-run with ${wantRounds} rounds per region: \`npm run axis ` +
            `--workspace=@exodra/benchmarks -- app-update 100 ${wantRounds}\`. (The axis's own ` +
            `default is ${DEFAULT_BATCH}; a run that gave rounds but not the third positional got ` +
            '1 from `scripts/run-one-axis.js` and landed here.)'
    );
}

/**
 * WHAT THE TABLE ABOVE CAN AND CANNOT SAY. It can RANK and it cannot SIZE, and this block exists to
 * say so in the axis's own unit rather than leave a reader to assume otherwise.
 *
 * THE NULL PAIR IS GONE AND NOTHING REPLACED IT. It was `exodra` against `exodra·twin` — two
 * separately declared copies of the BINDABLE app, whose true difference was zero by construction —
 * and both left this axis when the Exodra field was cut to the direct row and the machine row. With
 * them went the RESOLUTION FLOOR every gap here used to be read against, and with the floor went
 * three judgements this file used to print: P·MACHINE·SPLIT (which needed a third Exodra row as
 * well), P·INLINE (which needed a fourth), and P·DISPATCH / P·DISPATCH·PAIRS, both of which compare
 * a floor against a recorded one.
 *
 * WHAT IT WOULD TAKE TO GET IT BACK, stated because it is a decision and not a cleanup: a SECOND,
 * SEPARATELY DECLARED copy of `exodraDirect` or `exodraMachine` on its own backend, sampled next to
 * the row it bounds. Not a second render of the same components — that shares a declaration, a
 * compiled schema and every inline cache V8 built for it, and returns a scatter smaller than any
 * real comparison in the table carries.
 */
function reportOrderings(rows: readonly AbRow[], regionRounds: number): void {
    const f = (x: number): string => x.toFixed(3);
    const at = (name: string): AbRow | undefined => rows.find((r) => r.name === name);

    line('');
    refuseLine(
        'app-update: NO RESOLUTION — this axis carries no null pair, so nothing in this run says ' +
            'how small a difference the instrument can see and NO GAP IN THE TABLE ABOVE MAY BE ' +
            'QUOTED AS A SIZE. Every ordering below is an ORDERING and nothing more. See the block ' +
            'above this function for what restoring the floor would cost.'
    );
    line(
        `  THE UNIT IS ONE REGION OF ${regionRounds} UPDATE ROUNDS, everywhere in this block and ` +
            'in the table above. The recording carries the region size as its `batch` field, so a ' +
            'reader of the JSON never has to guess it.'
    );

    const ceiling = at('stage0');
    const exodra = at('exodra');

    // ── THE EXODRA ROW AGAINST THE HAND-WRITTEN CEILING ─────────────────────────────────────
    //
    // The question the pair exists to answer is whether a user CAN reach the ceiling through the
    // API. With no floor under the table the answer this run gives is an ORDER and not a distance,
    // and it is printed that way whichever side the Exodra row lands on.
    if (exodra !== undefined && ceiling !== undefined) {
        const gap = exodra.stat.median - ceiling.stat.median;
        line(
            `  exodra ${f(exodra.stat.median)} against the stage0 ceiling ` +
                `${f(ceiling.stat.median)}: ${f(Math.abs(gap))} ms ` +
                `${gap > 0 ? 'ABOVE' : gap < 0 ? 'BELOW' : 'level with'} it. AN ORDERING. If the ` +
                'Exodra row is above, the gap is a MISSING STRATEGY and not a tuning target — name ' +
                'what a user would have to be able to say. If it is below, it is doing a SMALLER ' +
                'JOB and the job is named: its transition commands the region with the rows that ' +
                'joined or left, where stage0 allocates the new tag array and ' +
                '`stage0/reconcile` rediscovers the same delta from it.'
        );
    }

    // ── P·UPDATE — WITHDRAWN, BECAUSE THE PAIR IT WAS ABOUT IS ONE ROW ──────────────────────
    //
    // IT PREDICTED NO DIRECTION between the machine row and the hand-written wire row, and was to
    // be settled by a SIZE this axis has no floor to make. The wire form of the app is deleted, so
    // there is no second median to subtract and the block prints nothing. Whoever declares a second
    // Exodra app here writes the prediction again, before that run.

    // ── THE `driver` ROW IS THE DENOMINATOR OF NOTHING ──────────────────────────────────────
    //
    // It bounds the HARNESS, not the job: the hand-written ceiling for the job is `stage0`, which
    // is a real program producing the real bytes.
    line(
        '  THE `driver` ROW IS NOT A RENDERER and is never read as a size anywhere in this file: ' +
            '`reportScale` prints it as an UPPER BOUND in ticks of the observed clock, and no ' +
            'ratio here has it as a denominator. The ceiling for the JOB is `stage0`.'
    );
}

export async function benchmarkAppUpdate(rounds = 100, batch = DEFAULT_BATCH): Promise<void> {
    // THE THIRD POSITIONAL IS ROUNDS PER TIMED REGION, and `abBench`'s scenario batch stays 1 —
    // see `DEFAULT_BATCH`. It is rounded UP to a multiple of four so the region is a whole number
    // of tag cycles and ends where it began; a bad value is corrected out loud rather than
    // silently, because the correction changes what every number in the table means.
    const regionRounds = Math.max(4, Math.ceil(batch / 4) * 4);
    if (regionRounds !== batch) {
        refuseLine(
            `app-update: ${batch} rounds per region is not a whole number of tag cycles ` +
                `(\`count\` cycles 1→2→3→4→1), so the region would end mid-cycle and weight the ` +
                `cheap transitions differently from the dear ones. Using ${regionRounds}. Pass a ` +
                'multiple of four to choose it yourself.'
        );
    }
    // OBSERVED BEFORE ANY PARTICIPANT IS LOADED, so nothing this run does is in the way of the
    // clock it then judges itself against. Printed in the phrasing `scripts/run-one-axis.js`
    // scrapes, which is why this axis's recordings carried `"quantum": null` until now.
    const quantum = observeTimerQuantum();
    line(
        `app-update: observed timer quantum (${quantum.toFixed(3)} ms) — ${regionRounds} update ` +
            `rounds per timed region, ${CARDS} cards, abBench batch 1 (one app standing at a ` +
            `time). Per-round grid ${(quantum / regionRounds).toFixed(4)} ms.`
    );

    const mounts = await loadMounts();

    const participants: Array<[string, Mount]> = [
        // THE WIRE ROW — the same app with no cell, no subscription and no diff, its two children
        // ports commanded as regions.
        ['exodra', mountExodraApp],
        // THE MACHINE ROW, DECLARED IMMEDIATELY AFTER THE ROW IT IS PAIRED WITH so the two are
        // sampled back to back in every round. It replaces neither row above it. Its state lives in
        // a machine and its children are the direct row's regions; see the header and P·UPDATE.
        ['exodra', mountExodraApp],
        ['solid', mounts.solid],
        ['svelte', mounts.svelte],
        ['react', mounts.react],
        // THE DROP-INS, ON REACT'S OWN SOURCE: `apps/react/react.tsx` with `react` resolved to Preact's
        // compat layer and to `@exodra/react-compat`, and its JSX twin `react-jsx.jsx` compiled by
        // `@exodra/babel-plugin-schema/react`. Same hooks, same keys, same gate.
        ['preact', mounts.preact],
        ['reactCompat', mounts.reactCompat],
        ['reactCompatTemplates', mounts.reactCompatTemplates],
        ['reactCompatJsx', mounts.reactCompatCompiled],
        ['million', mounts.million],
        ['reactCompiler', mounts.reactCompiler],
        ['voby', mounts.voby],
        // `marko` IS NOT HERE, and it is not a judgement on Marko: a mounted Marko template's whole
        // outside surface is `update(input)` / `destroy()` / `value`, so there is no way to reach a
        // card's `<let/open>` or its `onClick` body without dispatching a real event. See THE ONE
        // PARTICIPANT THAT IS GONE at the top of this file, and `MkToggle.marko`'s own header,
        // which established the same limit for the `toggle` axis before this change existed. It is
        // still measured on `exodra-app-update`, which is click-fired.
        ['lit', mountLitApp],
        ['mikado', mountMikadoApp],
        // `stage0` is the CEILING, not a competitor: its update round is the DOM calls the
        // handler makes, with no library between them. Read every row above it as "stage0 plus
        // what that library does for you".
        ['stage0', mountStage0App],
        ['uhtml', mountUhtmlApp],
        ['sinuous', mountSinuousApp],
    ];

    // THE INSTRUMENT'S OWN LOAD — not a renderer, and deliberately last. It is the driver's two
    // loops over 160 no-op closures, over the reference app's markup rendered inert, so its row is
    // what every row above it pays before its renderer is reached. It replaces the `floor` row this
    // axis used to carry, which priced 160 dispatched clicks — the harness that has left the clock.
    // Read every number in the table as "driver + the renderer's own work"; see
    // `participants/floor/app.ts`, which holds both floors and says which axis each belongs to.
    //
    // IT IS RENAMED AND NOT REUSED. A row called `floor` that means something else from one
    // recording to the next is the one thing a recorded table cannot survive, and `compare-axis`
    // matches rows by name.
    //
    // Kept OUT of the participants array because the gates below require a called round to MUTATE
    // the DOM and to ADDRESS one card at a time, and this one mutates nothing on purpose.
    const floor: [string, Mount] = ['driver', directFloorMount(mountExodraApp)];

    // THE MARKUP GATE. Each participant diffs its own tree against the reference app's, mounted
    // AND after an update round — and on an UPDATE axis the second diff is the one that matters,
    // because a different conditional strategy or a list that grew the wrong end shows up only
    // after a flip.
    //
    // EVERY LOADER-MOUNTED PARTICIPANT THIS AXIS STILL CARRIES IS IN THE LIST — svelte, solid, react
    // and voby. They come from `loadMounts()` and were never diffed at all; `scripts/verify-
    // structure.mjs` counts elements at the mount, and a count cannot see the space text node
    // Svelte keeps between two elements, cannot see the three derived values these axes now depend
    // on, and — the part that bites hardest HERE — never looks after an update at all.
    //
    // THESE GATES ALL DRIVE WITH `clickAll`, AND THAT IS DELIBERATE: they are the participants'
    // OWN gates, shared with `exodra-app-update`, and they establish "this participant's CLICK path
    // produces the reference's bytes". `gateDriveEqualsClick` below then establishes "this
    // participant's CALLED path produces its click path's bytes", and the two together are what
    // says the timed program builds the reference tree.
    const diverged: string[] = [];
    for (const [name, verify] of [
        ['lit-app', verifyLitApp],
        ['mikado-app', verifyMikadoApp],
        // The same two diffs for the three new arrivals, unwidened — and on an UPDATE axis the
        // second diff is the one that matters. Each verify below mounts the reference app beside
        // its own and runs one full round through both.
        ['stage0-app', verifyStage0App],
        ['uhtml-app', verifyUhtmlApp],
        ['sinuous-app', verifySinuousApp],
        // THE COMPILED PARTICIPANT, gated on the very mount this axis times — `mounts.svelte`, the
        // entry that owns Svelte's synchronous flush, so what is diffed is the function whose
        // numbers appear in the table. It takes a third diff (a second update round) because one
        // round moves every card in one direction only, and on an update axis a tag list that wraps
        // 4 → 1 and then grows again is exactly the shape a keyed reconcile gets wrong. Marko's
        // twin gate is not called here because Marko is not a participant here; it still runs on
        // `exodra-app-update`.
        ['svelte-app', () => verifySvelteApp(mounts.svelte)],
        // THE LAST THREE THAT WERE COUNT-ONLY — solid, react and voby — gated for the first time,
        // on the `loadMounts()` entries this axis times, through the same loop and at the same
        // three stages. On an UPDATE axis their third stage is the one that earns its keep: the
        // machinery being compared is `<Show>`/`<For>`, a keyed child array and voby's `<For>`, and
        // a reconcile that reinserts at the wrong end after a SHRINK is correct through two stages
        // and wrong at the third. Nothing is widened for them — solid's `<!>` and voby's
        // `createComment()` placeholders are the comment class `markup-gate.ts` has always stripped
        // from both sides, and React leaves no comment in the client tree at all.
        ['solid-app', () => verifySolidApp(mounts.solid)],
        ['react-app', () => verifyReactApp(mounts.react)],
        ['preact-app', () => verifyPreactApp(mounts.preact)],
        ['react-compat-app', () => verifyReactApp(mounts.reactCompat, 'react-compat-app')],
        [
            'react-compat-templates-app',
            () => verifyReactApp(mounts.reactCompatTemplates, 'react-compat-templates-app'),
        ],
        [
            'react-compat-compiled-app',
            () => verifyReactApp(mounts.reactCompatCompiled, 'react-compat-compiled-app'),
        ],
        ['million-app', () => verifyMillionApp(mounts.million)],
        ['react-compiler-app', () => verifyReactApp(mounts.reactCompiler, 'react-compiler-app')],
        ['voby-app', () => verifyVobyApp(mounts.voby)],
        // THE BANKED ROW, THROUGH THE SAME DIFFS AND TWO PROOFS OF ITS OWN, AND ON AN UPDATE AXIS
        // THE DIFFS ARE THE POINT: it re-declares nothing (it renders the reference's own `APP`
        // value through a second backend), so the mount diff is identical by construction and the
    ] as Array<[string, () => Promise<boolean>]>) {
        if ((await verify()) === false) diverged.push(name);
    }
    if (diverged.length > 0) {
        throw new Error(
            `app-update: ${diverged.join(' and ')} produce different markup from the reference ` +
                'app — the timings below would be comparing different programs'
        );
    }

    // ═══ THE THREE GATES THE CALLED ROUND HAS TO PASS, FOR EVERY PARTICIPANT ═══
    //
    // (1) THE DIRECT DRIVE IS WHAT A CLICK DOES — `gateDriveEqualsClick`, mount for mount, byte for
    //     byte, after each of four rounds. This is the whole justification for the change and it is
    //     checked per participant rather than argued once.
    // (2) OP `k` DRIVES CARD `k` AND NOTHING ELSE — `gateAddressing`. The markup diff above cannot
    //     see a wrong order or an aliased pair, because a round drives every card either way.
    // (3) A CALLED ROUND ACTUALLY MUTATES THE DOM — the honesty guard this axis has always had,
    //     now run through the driver instead of through `flip`: card0's details block goes 1 → 0,
    //     its tag count 1 → 2, and the kept tag is the SAME element. A participant that silently
    //     no-ops fails here instead of "winning".
    //
    // `driver` IS EXCLUDED FROM ALL THREE BY NAME. It moves nothing on purpose.
    for (const [name, make] of participants) {
        gateDriveEqualsClick(name, make);
        gateAddressing(name, make);

        const c = el();
        const app = drive(name, make, c);
        const card0 = () => c.querySelector('.card')!;
        const det = () => card0().querySelectorAll('.details').length;
        const tags = () => card0().querySelectorAll('.tag');
        // THE DECK LEVEL'S OWN HONESTY CHECK, at both of the two things a round moves there: deck
        // 0's NAME, which its own rename writes, and deck 0's DATE, which moves because round 0
        // advances user 0's setting and user 0 is deck 0's author. A row whose deck level rendered
        // once and then stood still passes every byte diff taken at the mount and fails here.
        const deck0 = () => c.querySelector('.deck')!;
        const deckName = () => deck0().querySelector('h2')!.textContent;
        const deckDate = () => deck0().querySelector('.date')!.textContent;
        const d0 = det();
        const n0 = tags().length;
        const firstBefore = tags()[0];
        const nameBefore = deckName();
        const dateBefore = deckDate();
        app.driver.round();
        const okd = det() === d0 - 1;
        const okt = tags().length === n0 + 1;
        const reused = tags()[0] === firstBefore;
        const okName = deckName() !== nameBefore;
        const okDate = deckDate() !== dateBefore;
        app.teardown();
        c.remove();
        if (!(d0 === 1 && n0 === 1 && okd && okt && reused && okName && okDate)) {
            throw new Error(
                `app-update: ${name} did not mutate the DOM as expected ` +
                    `(details toggled=${okd}, tags grew=${okt}, kept-tag reused=${reused}, ` +
                    `deck renamed=${okName}, deck date re-formatted=${okDate}) ` +
                    `— its measured region is a no-op / rebuild, results would be dishonest`
            );
        }
    }

    // ONE MOUNT PER SAMPLE, `regionRounds` ROUNDS INSIDE THE CLOCK, AND NO EVENT IN EITHER.
    //
    // The mount is untimed prep, as it always was; what changed is that the region is many rounds
    // of ONE app rather than five flips of each of five apps. That is deliberate and it is not the
    // same measurement `abBench`'s own batch would have made: `batch` scenarios means `batch`
    // separate mounts, each advanced ONE round — always round 1, always the same transition — where
    // a real application's second update lands on an app that is already warm and mid-cycle.
    const prep = (who: string, make: Mount) => (): Scenario => {
        const c = el();
        const app = drive(who, make, c);
        return {
            measure: () => {
                for (let r = 0; r < regionRounds; r++) app.driver.round();
            },
            cleanup: () => {
                app.teardown();
                c.remove();
            },
        };
    };
    const rows = await abBench(
        `APP UPDATE — 80 cards: details toggle + dynamic tag list ×${regionRounds} rounds ` +
            'per region, HANDLERS CALLED DIRECTLY (no event dispatch)',
        `ms/${regionRounds} rounds`,
        Object.fromEntries(
            [...participants, floor].map(([name, make]) => [name, prep(name, make)])
        ) as never,
        {
            rounds,
            // BATCH 1 ON PURPOSE — the repetition this axis needs is ROUNDS INSIDE ONE APP, not
            // more apps. See `DEFAULT_BATCH` and the note above `prep`.
            batch: 1,
            // WHAT THE APP COST EACH PARTICIPANT TO WRITE, beside what its update round costs.
            // Every row here drives the same tree through the same three operations and is gated
            // byte for byte before anything is timed, so the only thing this column can be about is
            // what the library made its author write. `driver` is mapped to `null`: it is the
            // driver's own two loops over inert markup, not an app.
            appLines: appLines({
                exodra: 'exodra',
                solid: 'solid',
                svelte: 'svelte',
                react: 'react',
                preact: 'react',
                reactCompat: 'react',
                reactCompatTemplates: 'react',
                reactCompatJsx: 'reactJsx',
                million: 'reactJsx',
                reactCompiler: 'reactJsx',
                voby: 'voby',
                lit: 'lit',
                mikado: 'mikado',
                stage0: 'stage0',
                uhtml: 'uhtml',
                sinuous: 'sinuous',
                driver: null,
            }),
            // THE ROWS, STATED FOR THE RECORDER rather than left to be scraped — see
            // `emitRecordedRows`.
            //
            // THE UNIT IS ONE REGION, and `per` carries the region length, so a recording of this
            // axis can never be read as milliseconds per round by mistake. That is the whole reason
            // it emits rather than letting the scraper take the table: a scraped row carries five
            // numbers and no statement of what one of them covers, and this axis's unit is a knob.
            //
            // THE SECTION IS `null` ON PURPOSE. The runner qualifies a recorded row as
            // `section/name` whenever a section is known, and this axis's rows are cited by BARE
            // name — by `docs-site/docs/benchmarks.md`, which looks them up through a
            // `<!-- gate: axis=app-update -->` block. Passing a section here would rename every row
            // in the next recording as a side effect.
            record: { section: null, unit: 'ms', per: `${regionRounds} update rounds` },
        }
    );

    // IS THIS A MEASUREMENT OR THE CLAMP — asked first, because everything below it is a statement
    // about the table and a table on the clamp supports none of them.
    reportScale(rows, quantum, regionRounds);

    // WHAT THIS RUN CAN AND CANNOT SAY ABOUT THE TABLE — printed AFTER it, because it is a
    // statement about it.
    reportOrderings(rows, regionRounds);
}

export async function reportAppUpdateRounds(): Promise<void> {
    const mounts = await loadMounts();
    const participants: Array<[string, Mount]> = [
        // The direct row, checked by hand on the same terms: its details block must be gone
        // and its tag list must have GROWN AT THE TAIL, leaving the first tag as the same element.
        // A region commanded at the wrong end fails here rather than "winning" the axis.
        ['exodra', mountExodraApp],
        // The machine row, checked by hand on the same terms: its transition must have committed
        // and its handler must have commanded the region, so that the details block is gone and the
        // tag list has GROWN AT THE TAIL with the first tag left as the same element.
        ['exodra', mountExodraApp],
        ['solid', mounts.solid],
        ['svelte', mounts.svelte],
        ['react', mounts.react],
        // THE DROP-INS, ON REACT'S OWN SOURCE: `apps/react/react.tsx` with `react` resolved to Preact's
        // compat layer and to `@exodra/react-compat`, and its JSX twin `react-jsx.jsx` compiled by
        // `@exodra/babel-plugin-schema/react`. Same hooks, same keys, same gate.
        ['preact', mounts.preact],
        ['reactCompat', mounts.reactCompat],
        ['reactCompatTemplates', mounts.reactCompatTemplates],
        ['reactCompatJsx', mounts.reactCompatCompiled],
        ['million', mounts.million],
        ['reactCompiler', mounts.reactCompiler],
        ['voby', mounts.voby],
        // `marko` IS NOT HERE — it cannot be advanced without a real event; see the top of this file.
        ['lit', mountLitApp],
        ['mikado', mountMikadoApp],
        // `stage0` is the CEILING, not a competitor: its update round is the DOM calls the
        // handler makes, with no library between them. Read every row above it as "stage0 plus
        // what that library does for you".
        ['stage0', mountStage0App],
        ['uhtml', mountUhtmlApp],
        ['sinuous', mountSinuousApp],
    ];

    // NO FLOOR ROW HERE. The `driver` row mutates nothing on purpose, and this export exists to
    // print what one round DID to card 0 for every participant — through the driver, because that
    // is what the axis times, and beside a click so the two can be compared by eye as well as by
    // the gate. A run of this that prints `called` and `clicked` differently is the gate's failure
    // shown rather than thrown.
    for (const [name, make] of participants) {
        const c = el();
        const app = drive(name, make, c);
        const card0 = () => c.querySelector('.card')!;
        const det = () => card0().querySelectorAll('.details').length;
        const tags = () => card0().querySelectorAll('.tag');
        const d0 = det();
        const n0 = tags().length;
        const firstBefore = tags()[0];
        app.driver.round();
        const reused = tags()[0] === firstBefore;
        const ok = d0 === 1 && n0 === 1 && det() === 0 && tags().length === 2 && reused;
        // eslint-disable-next-line no-console
        console.log(
            `${ok ? '✅' : '❌'} [${name}] called: details ${d0}->${det()} (want 1->0), ` +
                `tags ${n0}->${tags().length} (want 1->2), kept-tag REUSED=${reused}`
        );
        const called = markupOf(c);
        app.teardown();
        c.remove();

        const cc = el();
        const clicked = make(cc);
        clicked.flip();
        const same = markupOf(cc) === called;
        // eslint-disable-next-line no-console
        console.log(
            `${same ? '✅' : '❌'} [${name}]: one CALLED round === one CLICKED round, byte for byte`
        );
        clicked.teardown();
        cc.remove();
    }
}
