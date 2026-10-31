// HOW A CARD IS ADVANCED WITHOUT A SYNTHETIC EVENT — the registry `app-update` is built on,
// and nothing else. Framework-free, so a participant that is BUILT ON ITS OWN (`bench/build/`) can
// import it without dragging the field into its module graph, exactly as `todo-spec.ts` is.
//
// ═══ WHY THIS FILE EXISTS ═══
//
// Every app axis in this suite drives its participants with `clickAll` from `todo-spec.ts`: find
// 160 buttons with `querySelectorAll`, build a real `MouseEvent` for each and `dispatchEvent` it.
// A V8 CPU profile of the `app-update` scene, taken by the owner with
// `scripts/profile-app.mjs 300 direct update` and again with `… machine update`, aggregates by SELF
// TIME to this — the top of both profiles, and neither top is a renderer:
//
//       direct                          machine
//       29.2%  dispatchEvent (native)   27.0%  dispatchEvent (native)
//       20.5%  clickAll @ todo-spec.ts  20.7%  clickAll @ todo-spec.ts
//       11.8%  MouseEvent (native)      13.2%  MouseEvent (native)
//        6.0%  cloneNode                 4.1%  cloneNode
//        4.0%  setExoText                   3.3%  setExoText
//
// ~61% of that axis is the harness making and delivering events. It is IDENTICAL WORK FOR EVERY
// PARTICIPANT, so it is pure common-mode load: it inflates every row equally, deflates every ratio,
// and — because scatter grows with the work a region does — it sets the scatter that `app-update`'s
// null pair reports as its resolution floor. That axis resolves 0.120 ms on rows around 5 ms, and
// two of its rows differ by 0.060.
//
// So this file is the other door. A participant registers ITS OWN two per-card handlers here while
// it mounts, and ITS OWN one app-level round operation beside them; the axis then calls them
// directly, in document order, with no event anywhere.
//
// ═══ THE ROUND IS NO LONGER ONLY CARDS ═══
//
// Since the scene gained USERS (`todo-spec.ts`, THE USERS) and then DECKS (THE DECKS, in the same
// file), a round is FOUR things and not two: every deck's `.ren`, every card's `.tog`, every card's
// `.addTag`, and ONE USER'S SETTING advanced — a single write that has to move forty tags in forty
// different cards AND the dates of the two decks that user authored.
//
// NEITHER OF THE TWO NEW ONES IS ADDRESSABLE BY A CARD INDEX, and they are not addressable the same
// way as each other either, so each has a registry of its own: `noteDeckOps` for the ten renames,
// which ARE addressable — by a DECK index — and `noteRoundOp` for the one that is addressable by
// nothing because it belongs to the whole app. `TDeckOp` and `TRoundOp` below argue both.
//
// ═══ WHAT IS AND IS NOT REGISTERED ═══
//
// WHAT GOES IN IS THE HANDLER THE FRAMEWORK ITSELF INSTALLED — the very closure its own click path
// runs — and never a second spelling of what a click does. `lit` and `uhtml` already held that
// closure in a named field on their card record (`c.toggle` / `c.addTag`) and hand it over
// unchanged; `svelte` already had one of its two (`cycle`) and now names the other the same way;
// the rest had them written inline in a props object and they were hoisted to a `const` and passed
// to both places. NOTHING'S BEHAVIOUR CHANGED: the same one closure per handler per card is
// allocated, in the same place, and the same object is handed to the framework.
//
// TWO PARTICIPANTS HAVE NO SUCH CLOSURE TO LEND, AND THEY SAY SO.
//
//   `mikado`         its click path is ONE DELEGATED LISTENER that reads `e.target`, climbs to the
//                    card node and branches on `className`. The listener's body was split into two
//                    named functions of the card's state and the listener now calls them, so what
//                    is registered is the same code — but the TARGET RESOLUTION (the climb and the
//                    branch) stays in the listener and is not in the called path.
//   `exodraMachine`  it has no wire at all: `m.on(P.toggle, …)` is declared once per COMPONENT and
//                    the per-instance closure belongs to the machine. What is registered is a call
//                    of `toggleOpen(instance)` — the exported transition that file's own header
//                    calls its OUT INTERFACE, "reachable by anything holding a card".
//
// Both build their two closures only when a collection is open (`collectingCardOps`), so no other
// axis pays for them at all.
//
// ═══ WHAT IT COSTS EVERY OTHER AXIS, COUNTED RATHER THAN WAVED AT ═══
//
// One global load and one `!== null` comparison per card per mount, and one more per deck — 90 of
// them on a mount that clones 861 elements. `COLLECT` is null everywhere except inside
// `collectCardOps`, which only `app-update` calls, so no other axis ever takes the push. It is not
// free and it is not hidden: `initial-render`, `mount-phases`, `hydrate-floor`, `component-split`
// and every other axis that mounts this app pays those 90 comparisons inside their timed regions.
//
// ═══ WHAT IT DOES NOT DO ═══
//
// It does not flush. A framework that batches commits its work through its OWN flush, which the
// participant publishes as `AppHandle.commit` and `cardDriverOver` wraps every call in — react's
// `flushSync`, voby's `tick`, lit's per-card render pass. A driver that flushed on a framework's
// behalf would be this file deciding what "committed" means for somebody else's renderer.

/**
 * ONE DECK'S ONE HANDLER — the `.ren` button's, which renames the deck.
 *
 * ═══ WHY IT IS ITS OWN REGISTRY AND NOT A THIRD MEMBER OF `TCardOps` ═══
 *
 * The same argument `TRoundOp` makes below, one level up: a `TCardOps` is ADDRESSABLE BY A CARD
 * INDEX and `gateAddressing` in `app-update` rests on it — drive pair `k`, require card `k` and no
 * other card to move. A deck's rename moves a `<h2>` that is OUTSIDE every card and is shared by
 * eight of them; hung on the pair of the first card of each deck it would fail that gate at once,
 * and hung anywhere quieter it would fail it silently.
 *
 * IT IS ADDRESSABLE BY A DECK INDEX, which is why it is a list rather than a single closure like
 * `TRoundOp`: there are ten of them, they are declared in document order like the card pairs, and a
 * gate can therefore drive rename `k` alone and require deck `k` and nothing else to move.
 */
export type TDeckOp = () => void;

/** ONE CARD'S TWO HANDLERS — the pair every participant in this app allocates per card. */
export interface TCardOps {
    /** The `.tog` button's handler: flip this card's disclosure state. */
    readonly tog: () => void;
    /** The `.addtag` button's handler: advance this card's tag count 1→2→3→4→1. */
    readonly addTag: () => void;
}

/**
 * THE ROUND'S ONE OPERATION THAT IS NOT A CARD'S — advance `roundUserOf(round++)`'s setting.
 *
 * ═══ WHY IT IS ITS OWN REGISTRY AND NOT A THIRD MEMBER OF `TCardOps` ═══
 *
 * A `TCardOps` IS ADDRESSABLE BY A CARD INDEX and the whole of `gateAddressing` in `app-update`
 * rests on it: drive pair `k`, require card `k` and no other card to move. The user write moves
 * FORTY cards in one call. Hung on card 0's pair it would fail that gate immediately, and hung
 * anywhere quieter it would fail it silently — 40 cards moving on op 0 reads exactly like the
 * aliasing bug the gate exists to catch. It is not a card's operation, so it does not go in the
 * type that means "a card's operation".
 *
 * ═══ WHY IT IS REGISTERED HERE AND NOT PERFORMED BY THE AXIS ═══
 *
 * `app-update` could advance the user itself — it knows `roundUserOf` and `nextChars`. It would then
 * be reaching into somebody else's app to write somebody else's state, deciding for a renderer what
 * "the setting changed" means to it. That is the same thing this file refuses to do about flushing,
 * for the same reason: a participant publishes how its own work is committed, and an instrument that
 * decides on its behalf is timing a program the participant did not write.
 *
 * ═══ WHY IT RUNS INSIDE `commit` AND AFTER BOTH CARD LOOPS ═══
 *
 * INSIDE, because `flip` puts all three steps inside one flush for a batching participant, and a
 * called round that committed the 160 card writes and then committed the user write separately would
 * be TWO passes where the clicked path is one — a difference the byte gate cannot see and the clock
 * can. AFTER, because that is the order `AppHandle.flip` states: a tag added by `.addtag` is built
 * at the old setting and rewritten by this, and a participant that reordered them would do a
 * different amount of work for the same bytes.
 *
 * IT IS THE PARTICIPANT'S OWN CLOSURE, exactly as a card pair is — the very one its `flip` calls,
 * never a second spelling of it here.
 */
export type TRoundOp = () => void;

/** One mount's declarations: a rename per deck, a pair per card, and the round's one app-level
 *  operation. */
interface TCollection {
    readonly decks: TDeckOp[];
    readonly cards: TCardOps[];
    readonly rounds: TRoundOp[];
}

/**
 * HOW A PARTICIPANT COMMITS A BATCH OF ITS OWN HANDLER CALLS, SYNCHRONOUSLY.
 *
 * The same wrapper each batching participant already puts around `clickAll` inside its `flip` —
 * react's `flushSync(fn)`, voby's `fn(); tick()`, lit's `fn(); flush()`. A participant that commits
 * inside the handler (every Exodra row, stage0, solid, mikado, uhtml, sinuous) publishes none and
 * gets `CALL` below, which is one call frame and nothing else.
 */
export type TCardCommit = (run: () => void) => void;

/** The open collection, or `null` — which it is everywhere except inside `collectCardOps`. */
let COLLECT: TCollection | null = null;

/**
 * A PARTICIPANT DECLARING ONE CARD'S PAIR OF HANDLERS, from inside its own mount.
 *
 * Called in the order the cards are built, which is document order in all fifteen participants —
 * and that is not taken on trust anywhere: `app-update` proves it per participant with an
 * ADDRESS GATE that drives op `k` alone and requires exactly card `k` to move.
 */
export function noteCardOps(tog: () => void, addTag: () => void): void {
    if (COLLECT !== null) COLLECT.cards.push({ tog, addTag });
}

/**
 * A PARTICIPANT DECLARING ONE DECK'S RENAME HANDLER, from inside its own mount — see `TDeckOp`.
 *
 * Called in the order the decks are built, which is document order in every participant, and taken
 * on trust nowhere: the address gate drives rename `k` alone and requires exactly deck `k` to move.
 *
 * IT IS THE HANDLER THE PARTICIPANT'S OWN `.ren` BUTTON CARRIES, never a second spelling of what a
 * rename does — the same rule `noteCardOps` states for the card pair.
 */
export function noteDeckOps(rename: TDeckOp): void {
    if (COLLECT !== null) COLLECT.decks.push(rename);
}

/**
 * A PARTICIPANT DECLARING ITS ROUND'S ONE APP-LEVEL OPERATION — see `TRoundOp`.
 *
 * EXACTLY ONE PER MOUNT, and the count is checked by the caller of `collectCardOps` rather than
 * here, the same way the card pairs are: a participant that has not been given a user pool yet
 * registers none, and a run in which forty tags never move must say the participant's name.
 *
 * IT IS CALLED FROM THE MOUNT, not from the wire of a card, and the closure it is handed is the one
 * the participant's own `flip` calls — so the called round and the clicked round advance the same
 * counter over the same five users.
 */
export function noteRoundOp(advance: TRoundOp): void {
    if (COLLECT !== null) COLLECT.rounds.push(advance);
}

/**
 * IS A COLLECTION OPEN — for the TWO participants whose handler pair cannot be handed to
 * `noteCardOps` already built, because their program does not contain one.
 *
 * `exodraMachine` has no wire: its handlers are declared once per COMPONENT and the per-instance
 * closure belongs to the machine. The only place that file is handed the instance is the seed, so
 * the two closures it registers have to be BUILT THERE.
 *
 * `mikado` has one DELEGATED listener that reads `e.target` and branches, so there is no per-card
 * closure anywhere in it either; its two registered closures are built in the per-card loop.
 *
 * Building them unconditionally would add 160 closure allocations to every mount of those rows,
 * inside `initial-render`'s timed region. So those two call sites ask first — one global load and
 * one comparison, false on every axis but `app-update`. Everywhere else `noteCardOps` is handed the
 * framework's own closure, which existed either way, and no predicate is needed.
 */
export function collectingCardOps(): boolean {
    return COLLECT !== null;
}

/**
 * RUN `build` WITH A COLLECTION OPEN, and hand back what it made together with every pair the
 * mount declared while it ran.
 *
 * IT DOES NOT NEST, and the refusal is a throw rather than a stack: two collections open at once
 * would silently interleave two apps' handlers into one array, and an axis that then drove the
 * mixture would be timing a program nobody wrote. `withoutCardOps` is the way to mount something
 * inside a collection without contributing to it.
 */
export function collectCardOps<T>(build: () => T): {
    readonly value: T;
    readonly ops: readonly TCardOps[];
    /** Every deck rename the mount declared, in document order. The caller requires exactly `DECKS`
     *  of them and says whose mount it was when there are not — see `noteDeckOps`. */
    readonly decks: readonly TDeckOp[];
    /** Every round operation the mount declared. The caller requires exactly one and says whose
     *  mount it was when there is not — see `noteRoundOp`. */
    readonly rounds: readonly TRoundOp[];
} {
    if (COLLECT !== null) {
        throw new Error(
            'card-driver: a collection is already open. Collections do not nest — use ' +
                '`withoutCardOps` for a mount that must not contribute to the one in progress.'
        );
    }
    const open: TCollection = { decks: [], cards: [], rounds: [] };
    COLLECT = open;
    try {
        const value = build();
        return { value, ops: open.cards, decks: open.decks, rounds: open.rounds };
    } finally {
        COLLECT = null;
    }
}

/**
 * RUN `build` WITH COLLECTION SUSPENDED — for a mount that happens inside a collection window and
 * must not be part of it.
 *
 * Both callers are floor rows — `directFloorMount` in `participants/floor/app.ts` and
 * `mountFloor` in `profilers/profile-app.tsx` — which mount the reference app to get its markup and then throw that mount
 * away. Without the suspension each would register the reference's 80 real handler pairs and the
 * floor would be the reference app wearing another name: the single most flattering way a floor
 * row can be wrong.
 */
export function withoutCardOps<T>(build: () => T): T {
    const saved = COLLECT;
    COLLECT = null;
    try {
        return build();
    } finally {
        COLLECT = saved;
    }
}

/** What a participant with no batching gets: the call, and one frame for it. Shared by all. */
const CALL: TCardCommit = (run) => {
    run();
};

/**
 * ONE MOUNTED APP, CALLED DIRECTLY — what the axis times and what its gates address.
 *
 * `round()` IS THE UNIT AND IT IS `flip()` WITHOUT THE EVENTS: every deck's `.ren` handler in
 * document order, then every card's `.tog` handler in document order, then every card's `.addTag`
 * handler in document order, then the app's own round operation, all inside the participant's own
 * commit — the same four passes in the same order `flip`'s three `clickAll` calls and its advance
 * closure make.
 */
export interface TCardDriver {
    /** How many pairs the mount registered. The axis requires this to be the app's card count. */
    readonly cards: number;
    /** How many renames the mount registered. The axis requires this to be the app's deck count. */
    readonly decks: number;
    /** Deck `k`'s `.ren` handler alone, committed. For the address gate; never timed. */
    rename(k: number): void;
    /** Card `k`'s `.tog` handler alone, committed. For the address gate; never timed. */
    tog(k: number): void;
    /** Card `k`'s `.addTag` handler alone, committed. For the address gate; never timed. */
    addTag(k: number): void;
    /**
     * THE ROUND'S APP-LEVEL OPERATION ALONE, committed — one user's setting advanced, no card
     * handler called. For a gate; never timed.
     *
     * It is the counterpart of `tog(k)` and `addTag(k)`: those let a gate prove that a card
     * operation moves ONE card, and this lets a gate prove that the user operation moves the tags
     * of `roundUserOf(r)` and NOTHING ELSE — no headline, no `aria-expanded`, no `.count`, and no
     * tag belonging to another user. A participant that re-rendered every card on a user write
     * would pass every byte diff in the suite and fail that.
     */
    advanceUser(): void;
    /** ONE UPDATE ROUND — the timed unit. Allocates nothing. */
    round(): void;
}

/**
 * Build the driver over one mount's registered pairs.
 *
 * `round` HOLDS ONE PRE-ALLOCATED CLOSURE and passes the same object to `commit` every time, so a
 * timed region of N rounds allocates nothing at all on the instrument's side. A `commit(() => …)`
 * written at the call site would have allocated one closure per round per participant — common-mode
 * and small, and still a thing the instrument was doing inside its own clock.
 */
export function cardDriverOver(
    ops: readonly TCardOps[],
    decks: readonly TDeckOp[],
    rounds: readonly TRoundOp[],
    commit: TCardCommit = CALL
): TCardDriver {
    // THE FOUR LOOPS ARE `AppHandle.flip`'s FOUR STEPS IN ITS ORDER — the decks first, then both
    // card passes, then the app's one operation. The last loop is a loop and not `rounds[0]()`, and
    // there is exactly one element in it: a caller that has checked the count loses nothing, and a
    // caller that has not gets a round that runs whatever was declared instead of one that silently
    // runs the first of several.
    const runRound = (): void => {
        for (let k = 0; k < decks.length; k++) decks[k]();
        for (let k = 0; k < ops.length; k++) ops[k].tog();
        for (let k = 0; k < ops.length; k++) ops[k].addTag();
        for (let k = 0; k < rounds.length; k++) rounds[k]();
    };
    const runUser = (): void => {
        for (let k = 0; k < rounds.length; k++) rounds[k]();
    };
    return {
        cards: ops.length,
        decks: decks.length,
        rename: (k: number): void => {
            commit(() => decks[k]());
        },
        tog: (k: number): void => {
            commit(() => ops[k].tog());
        },
        addTag: (k: number): void => {
            commit(() => ops[k].addTag());
        },
        advanceUser: (): void => {
            commit(runUser);
        },
        round: (): void => {
            commit(runRound);
        },
    };
}
