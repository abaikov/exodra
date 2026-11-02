// DIAGNOSTIC — THE TWO CORE ENTRY POINTS NO AXIS HAD EVER LOADED: `createExoStatic` and
// `createExoOne`. ONE OF THE TWO NO LONGER EXISTS, AND THAT IS THIS AXIS'S ANSWER.
//
// Twenty-five axes are registered in `scripts/run-one-axis.js` and, before this file, not one of
// them imported either name. Every list benchmark in this suite drives MANY children; the two
// shapes an ordinary application's tree is mostly made of — A CHILD THAT NEVER CHANGES, and ONE
// POSITION WHOSE OCCUPANT DOES — were exercised only incidentally, inside pages timing something
// else. This axis is the first program in the repository that measures either on purpose, and it
// now measures ONE of them: `createExoStatic`, priced by TABLE 1. The single-position half is
// struck, because the mechanism it was pointed at is deleted from the library.
//
// It is written to the `mount-floor` / `update-floor` / `hydrate-floor` / `ssr-floor` /
// `teardown-floor` / `keystroke-floor` set: a phase per program, a floor with no framework in it,
// byte-identical markup AND byte-identical text gated before anything is timed, a resolution floor
// measured from a control whose true difference is zero, every way it can mislead stated here and
// repeated in the answer, and a run that refuses its own numbers by name when they are unreadable.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THE TWO ENTRY POINTS ACTUALLY WERE — READ OUT OF THE FILES, NOT ASSUMED ────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE BRIEF THAT ASKED FOR THIS AXIS GUESSED WRONG ABOUT BOTH, AND THE GUESSES ARE WORTH PRINTING
// BESIDE THE FACTS, because they are the guesses any reader of the names would make.
//
// GUESSED: `createExoOne` is a fast path for a children region that holds exactly one child.
// ACTUALLY it was a two-field constructor and nothing else — it built the PAIR
// `{ component, props }` that a `bindOne` source yielded — and its whole content was a TYPE CHECK:
// `TExoOne` erased the props to `never`, so the pairing had to come through the function, where
// both halves were still generic and TypeScript compared them.
//
// AND IT IS DELETED FROM `@exodra/core`, WITH NO REPLACEMENT. PROPS DO NOT EXIST ANYWHERE IN THIS
// LIBRARY ANY MORE: a wire is `(enode, index: number) => TOut`, so the pair had nothing left to
// carry. NO DOOR EVER TOOK A `TExoOne`: outside core the name occurred exactly twice in the whole
// tree — `packages/dom/src/hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts` and
// `packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts` — and in BOTH it was an unused import, present in the
// import list and in no body. `c.bindOne`, which consumed the pair, is gone from every exonode;
// `TExoChildrenApi` and the backend's `children` field are gone, so a single-position reconciler
// has no field to be composed onto; `attach-exo-one.ts` and `attach-exo-children.ts` no longer
// exist in `packages/dom/src`. So TABLE 2 — every row of which built a `createExoOne` pair — is
// struck whole, and these are the six rows and what each priced:
//
//   driver        the bare notification: setValue into a bindable with one no-op subscriber.
//   driver·twin   the same program under a second name — that table's null control.
//   native·swap   THE FLOOR for a swap: removeChild, createElement, appendChild, by hand.
//   bindOne       the THEN-SHIPPED single position — `c.bindOne` over the general children
//                 reconciler. Neither door exists now.
//   one·slot      THE STRATEGY: a 30-line reconciler that knew its region held at most one child,
//                 composed onto the backend's `children` field.
//   swap·same     the documented "per notification that changes nothing: NOTHING AT ALL" path;
//                 it lived outside TABLE2 because its post-operation markup was the MOUNT's.
//
// NO REPLACEMENT TABLE IS OFFERED AND NONE SHOULD BE INVENTED. There is no one-position door left
// to price, so the honest state of that question is that it has NO MECHANISM — not that it has a
// slower one.
//
// GUESSED: `createExoStatic` marks a child that never changes, so the engine may skip work per child.
// ACTUALLY (`packages/core/src/machine/factories/createExoStatic.ts`) it is a MACHINE
// CONSTRUCTOR for a machine with NO PORTS, whose two lists are shared frozen module constants:
//
//     …if (schema.portList.length > 0) throw …
//     return { declaration: schema, forms: [], wire: null, effects: EXO_NO_EFFECTS, handlers: EXO_NO_HANDLERS };
//
// It is a SHORTHAND with a REFUSAL in it. The refusal (`createExoStatic.ts:17-27`) is the
// load-bearing half and it ships in production builds, as the code `EXO0019`: a cursor that
// declared ports gets an error, because a static component arms nothing at all and those ports
// would stay empty for the life of the page with no error anywhere and both backends agreeing.
//
// AND HERE IS WHAT TABLE 1 PRICES, WHICH IS NOT WHAT THIS FILE WAS FIRST WRITTEN TO PRICE. The
// earlier shape of this entry point returned a shared EMPTY WIRE, `EXO_NO_WIRE`, and the payoff was
// to be an IDENTITY test — `component.wire === EXO_NO_WIRE` — that no backend ever performed, so
// the empty wire was called once per instance like any other and the skip was an available,
// unclaimed design. THAT IS NO LONGER THE STATE OF THE CODE. `EXO_NO_WIRE` does not exist; a static
// component's `wire` is `null`, and the arming path READS THAT SENTINEL:
//
//     const wire = plan.wire;
//     if (wire !== null) enode.state = wire(enode, index);
//                                       // packages/core/src/machine/armExoNode.ts:9-10
//
// Every DOM instance arrives through it (`dom/src/dom/factories/createExoMachineNode.ts:34`), so
// a static child really does skip a per-instance call, while the wired twin pays one —
// `createExoMachine` puts the twin's `createInitialState` in the field `armExoNode` tests. TABLE 1's `static`
// and `empty·wire` rows are therefore a comparison of TWO REAL PATHS and no longer a test of an
// unread identity: `static` arms through the null branch, `empty·wire` runs the same static child
// behind a FRESH `() => {}`. What separates them is one function call and one `enode.state`
// assignment per card, and the resolution floor printed under the table is what says whether this
// run can see a difference that small.
//
// HYDRATION AND THE STRING BACKEND — THE THIRD QUESTION THE BRIEF ASKED.
//  - `createExoOne` HAD a hydration counterpart, and it went with the rest: there is no
//    `adopt-exo-one.ts` in `packages/dom/src/hydrate` and no `bindOne` on `TExoHydrateNode`.
//  - `createExoStatic` has NO counterpart anywhere and needs none: it produces an ordinary
//    `TExoMachine` with an empty `portList`, and every backend takes it unchanged
//    (`packages/core/src/component/tests/createExoStatic.test.ts:20-29`). On the server a zero-port
//    schema collapses to arity zero and renders as one prepared string — but that is a property of
//    HAVING NO PORTS, which `createExoMachine` with an empty cursor has too, not of this function.
//
// THIS AXIS MEASURES THE DOM BACKEND ONLY. `ssr-floor` is where the server number would go.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HOW A JOB WHOSE FLOOR IS ZERO IS REPORTED, AND THIS IS DECIDED BEFORE ANYTHING RUNS ─────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A STATIC CHILD IS THE SHARPEST TEST IN THIS SUITE because the floor is NOTHING AT ALL. If the
// footer is part of the card's own declaration, the clone that makes the card already contains it:
// the marginal cost of that subtree, over and above the card, is a bigger `cloneNode` and no second
// instance, no second schema, no second insert, no wire call. There is no denominator.
//
//     SO NO RATIO IS PRINTED FOR IT, AND NONE MAY BE QUOTED FROM IT. Any "×" against the inline row
//     would be a ratio of two TOTALS — two whole 200-card mounts — and would say nothing about the
//     job, which is the one child. Divide by a floor of zero and the answer is infinity for any
//     cost at all, including a cost too small to matter.
//
//     THE FIGURE THIS TABLE PUBLISHES IS AN ABSOLUTE, IN NANOSECONDS PER STATIC CHILD:
//         (row's ms per mount − `inline`'s ms per mount) × 1e6 / CARDS
//     Both terms are MEASURED ROWS of the same table, sampled in the same rounds, so the
//     subtraction is one the ladder rule allows. It is a DIVISION of a region, not a measurement of
//     a child: nothing in this file times one static child and nothing could — see SCALE below.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── HAZARDS, EACH OF WHICH HAS BITTEN THIS SUITE ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE CLOCK. `performance.now()` is clamped in this browser. The quantum is OBSERVED at run time,
// printed, and every timed region must clear MIN_TICKS × it or the run refuses THAT REGION BY NAME
// and prints the batch that would clear it. `toggle` printed the timer thirteen times before this
// discipline existed.
//
// A LADDER THAT DOES NOT NEST. Three axes printed that refusal this week. Here the structural
// nesting claim is: `static` and `empty·wire` each do everything `inline` does and then build a
// second instance, so a row measuring CHEAPER than `inline` past the resolution floor makes the
// per-child subtraction NEGATIVE and the whole table unreadable — refused by name.
// `native` is NOT claimed to be under `inline`: a clone is not structurally slower or faster than
// `createElement` (see `mount-floor`'s finding that cloning BEATS one `innerHTML` crossing), so
// that pair is a comparison and not a rung, and no refusal is attached to its direction.
//
// SCALE, AND THE DIVISION. ONE static child is nanoseconds, and nothing here times one. TABLE 1
// builds CARDS = 200 cards per mount and MOUNT_REPS = 8 mounts per timed region — 1600 STATIC
// CHILDREN PER REGION — and every per-child figure is that region divided by 1600. A DIVISION IS
// NOT A MEASUREMENT: it bounds the average, it says nothing about any individual child, and it
// cannot see a cost that is paid once per mount rather than once per child.
//
// ONE AXIS PER PROCESS. This suite crashes on memory pressure when several axes share a run. This
// file is registered as its own axis and is meant to be invoked alone:
//     npm run axis --workspace=@exodra/benchmarks -- one-and-static 100 1
//
// ── THE GATE ────────────────────────────────────────────────────────────────────────────────
//
// Every program's MARKUP and TEXT are compared against the reference after the mount, before a
// single region is timed. Markup goes through the shared `gateMarkup`; TEXT is checked separately here,
// because `innerHTML` equality does not imply `textContent` equality for a tree with a text node
// written by a property store (`keystroke-floor` learned that the other way round: an `<input>`'s
// `value` property does not appear in `innerHTML` at all). This repo has one axis whose first run
// was stopped because a hand-written prototype lacked a ` value=""` the renderer emits. The gate
// throws; a divergent participant never reaches the timer.

import {
    createExoStatic,
    type TExoMachine,
    type TExoChildrenPort,
    type TExoTextPort,
} from '@exodra/core';
import {
    ExoDomBackend,
    type TExoDomBackend,
    type TExoCompilerApi,
    type TExoDomNode,
    withExoCompiler,
} from '@exodra/dom';
import { gateMarkup, markupOf } from '../../gates/markup-gate';
import { el } from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';
import { createExoSchema } from '@exodra/core';
import { createExoMachine } from '@exodra/core';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);

function refuse(message: string): never {
    // eslint-disable-next-line no-console
    console.log(`❌ ${message}`);
    throw new Error(message);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════════════════

type TExoWiredComponent = TExoMachine<TExoDomNode>;

/** Cards per mount on TABLE 1 — one static child each. */
const CARDS = 200;
/** Mounts per timed region on TABLE 1. 8 × 200 = 1600 static children per region. */
const MOUNT_REPS = 8;

/** The static subtree, written once so all four TABLE 1 programs describe the same three elements. */
const FOOTER_MARKUP = '<footer class="f"><i class="d">*</i><em>archived</em></footer>';

/** The static child, as `createExoStatic` — no ports, a `null` `wire`. */
const FOOTER_STATIC = createExoStatic((b) => {
    b.el('footer', { class: 'f' }, (f) => {
        f.el('i', { class: 'd' }, (i) => {
            i.text('*');
        });
        f.el('em', null, (e) => {
            e.text('archived');
        });
    });
});

/**
 * THE SAME STATIC CHILD BEHIND A FRESH EMPTY WIRE — the twin that prices the null sentinel.
 *
 * A static component's `wire` is `null` and `armExoNode` branches on that, so
 * `static` skips a call per card where this row makes one. The difference is one call and one
 * `enode.state` assignment; whether this run can see it is what the resolution floor answers.
 */
const FOOTER_WIRED_SCHEMA = createExoSchema((b) => {
    b.el('footer', { class: 'f' }, (f) => {
        f.el('i', { class: 'd' }, (i) => {
            i.text('*');
        });
        f.el('em', null, (e) => {
            e.text('archived');
        });
    });
    return {};
});
const mFOOTER_WIRED = createExoMachine<TExoDomNode>(FOOTER_WIRED_SCHEMA, {
    createInitialState: () => {
        /* an empty wire, so `wire` is a function and not `null` */
    },
});
const FOOTER_WIRED = mFOOTER_WIRED;

/** The card, with the static subtree INLINE in its own schema — the clone already contains it. */
const CARD_INLINE_SCHEMA = createExoSchema((b) => {
    let title!: TExoTextPort;
    b.el('article', { class: 'card' }, (a) => {
        a.el('h3', { class: 't' }, (h) => {
            title = h.textPort();
        });
        a.el('div', { class: 's' }, (s) => {
            s.el('footer', { class: 'f' }, (f) => {
                f.el('i', { class: 'd' }, (i) => {
                    i.text('*');
                });
                f.el('em', null, (e) => {
                    e.text('archived');
                });
            });
        });
    });
    return { title };
});
const mCARD_INLINE = createExoMachine<TExoDomNode, number>(CARD_INLINE_SCHEMA, {
    createInitialState: (c, i) => {
        c.text(CARD_INLINE_SCHEMA.ports.title, `Card ${i}`);
    },
});
const CARD_INLINE = mCARD_INLINE;

/**
 * A SECOND, SEPARATELY DECLARED, IDENTICAL CARD — the null control for TABLE 1.
 *
 * It is its own `createExoMachine` call and therefore its own declaration and its own compiled
 * schema, so `inline` against `inline·twin` is two different programs doing exactly the same work.
 * Reusing ONE component under two row names would have shared a schema and understated the scatter.
 */
const CARD_INLINE_TWIN_SCHEMA = createExoSchema((b) => {
    let title!: TExoTextPort;
    b.el('article', { class: 'card' }, (a) => {
        a.el('h3', { class: 't' }, (h) => {
            title = h.textPort();
        });
        a.el('div', { class: 's' }, (s) => {
            s.el('footer', { class: 'f' }, (f) => {
                f.el('i', { class: 'd' }, (i) => {
                    i.text('*');
                });
                f.el('em', null, (e) => {
                    e.text('archived');
                });
            });
        });
    });
    return { title };
});
const mCARD_INLINE_TWIN = createExoMachine<TExoDomNode, number>(CARD_INLINE_TWIN_SCHEMA, {
    createInitialState: (c, i) => {
        c.text(CARD_INLINE_TWIN_SCHEMA.ports.title, `Card ${i}`);
    },
});
const CARD_INLINE_TWIN = mCARD_INLINE_TWIN;

/** The card whose static subtree is a CHILD INSTANCE in a children port. */
function cardWithChild(child: TExoWiredComponent): TExoWiredComponent {
    const MACHINE_SCHEMA = createExoSchema((b) => {
        let title!: TExoTextPort;
        let slot!: TExoChildrenPort;
        b.el('article', { class: 'card' }, (a) => {
            a.el('h3', { class: 't' }, (h) => {
                title = h.textPort();
            });
            a.el('div', { class: 's' }, (s) => {
                slot = s.childrenPort();
            });
        });
        return { title, slot };
    });
    const mMachine = createExoMachine<TExoDomNode, number>(MACHINE_SCHEMA, {
        createInitialState: (c, i) => {
            c.text(MACHINE_SCHEMA.ports.title, `Card ${i}`);
            c.one(MACHINE_SCHEMA.ports.slot, child);
        },
    });
    return mMachine;
}

const CARD_STATIC = cardWithChild(FOOTER_STATIC);
const CARD_WIRED = cardWithChild(FOOTER_WIRED);

/** THE FLOOR for TABLE 1: no abstraction, no declaration, no schema — the same tree, by hand. */
function nativeCards(root: HTMLElement, n: number): void {
    // THE SAME WRAPPER THE LIST NEEDS, created by hand. See `listOf`: the schema's one root is a
    // `<div class="cards">`, so a floor without it builds a different tree and the gate says so.
    const parent = nativeCardsRoot(root);
    for (let i = 0; i < n; i++) {
        const article = document.createElement('article');
        article.className = 'card';
        const h3 = document.createElement('h3');
        h3.className = 't';
        h3.textContent = `Card ${i}`;
        article.appendChild(h3);
        const slot = document.createElement('div');
        slot.className = 's';
        const footer = document.createElement('footer');
        footer.className = 'f';
        const dot = document.createElement('i');
        dot.className = 'd';
        dot.textContent = '*';
        footer.appendChild(dot);
        const em = document.createElement('em');
        em.textContent = 'archived';
        footer.appendChild(em);
        slot.appendChild(footer);
        article.appendChild(slot);
        parent.appendChild(article);
    }
}

/**
 * THE ONE BACKEND, COMPOSED ONCE AT MODULE LOAD, AND NEVER INSIDE A RENDER.
 *
 * A backend is the schema cache key and it is compared by POINTER: one built per render would hand
 * the cache a fresh key every time and recompile every declaration — markup parse included — on
 * every mount, which would make these rows a measurement of the compiler. `ExoDomBackend.ts` says
 * the same thing about itself, in its "THE BACKEND IS THE SCHEMA CACHE KEY" section.
 */
const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════════════════════

// ═══ WHY EVERY EXODRA ROW HERE IS ONE `render` OF A FIXED LIST ═══
//
// `backend.render(component, parent)` MOUNTS ONE INSTANCE. A card writes `Card ${i}` from the number
// it is armed with, `native` writes the same, and the markup gate refuses any pair whose trees differ.
//
// SO THE PER-ROW NUMBER COMES FROM THE LIST, which is where it comes from in an application:
// `c.list(port, CARD, numbers)` arms row `i` with `numbers[i]`, which is `i`
// (`EXO_DOM_NODE_VOCABULARY.ts`'s `list` passes `params[i]` to `mountExoInstance`). One `render`,
// one outer instance, `n` cards under it.
//
// IT IS THE FIXED LIST AND NOT A RECONCILED ONE. A fixed list has no row record, no diff and no
// registry, so nothing in these numbers is a reconciler — which is what TABLE 1 is asked about: the
// cost of a static CHILD, not the cost of a changing one.
//
// THE ENTRY POINT'S FIXED SETUP IS PAID PER `render` — one teardown scope — and there is one
// `render` per row of the table, not one per card.
//
// THE WRAPPER IS REAL AND BOTH SIDES PAY IT. A list needs a root to hang its children port on — a
// schema is ONE element and this core has no fragment — so `<div class="cards">` stands around the
// cards, and `nativeCards` creates the identical element. One `createElement` on each side, against
// 1200 elements of tree; the gate proves the two trees are the same.

/** `n` instances of `row`, as one component: `<div class="cards">` with a fixed list inside it. */
function listOf(row: TExoWiredComponent, n: number): TExoWiredComponent {
    const MACHINE_SCHEMA2 = createExoSchema((b) => {
        let slot!: TExoChildrenPort;
        b.el('div', { class: 'cards' }, (d) => {
            slot = d.childrenPort();
        });
        return { slot };
    });
    const numbers = Array.from({ length: n }, (_, i) => i);
    const mMachine2 = createExoMachine<TExoDomNode>(MACHINE_SCHEMA2, {
        createInitialState: (c) => {
            c.list(MACHINE_SCHEMA2.ports.slot, row, numbers);
        },
    });
    return mMachine2;
}

/** The wrapper the hand-written floors must open and close, so their tree matches. */
function nativeCardsRoot(parent: HTMLElement): HTMLElement {
    const holder = document.createElement('div');
    holder.className = 'cards';
    parent.appendChild(holder);
    return holder;
}

// THE WRAPPERS ARE BUILT ONCE, AT MODULE LOAD, and never inside a `mount`. A schema is cached on
// the DECLARATION, so a component constructed per mount would compile a fresh schema per mount —
// markup parse included — inside a timed region, and every number on this axis would be a compile.
const LIST_INLINE = listOf(CARD_INLINE, CARDS);
const LIST_INLINE_TWIN = listOf(CARD_INLINE_TWIN, CARDS);
const LIST_STATIC = listOf(CARD_STATIC, CARDS);
const LIST_WIRED = listOf(CARD_WIRED, CARDS);

function mountRows(
    backend: TExoDomBackend & TExoCompilerApi,
    list: TExoWiredComponent,
    parent: HTMLElement
): () => void {
    return backend.render(list, parent);
}

interface MountProgram {
    readonly name: string;
    readonly what: string;
    /** Builds the tree into `parent` and hands back its teardown. */
    readonly mount: (parent: HTMLElement) => () => void;
}

const TABLE1: readonly MountProgram[] = [
    {
        name: 'native',
        what: 'straight-line createElement — no declaration, no schema, no clone. THE FLOOR for the mount.',
        mount: (parent) => {
            nativeCards(parent, CARDS);
            return () => {
                parent.textContent = '';
            };
        },
    },
    {
        name: 'inline',
        what: 'the static subtree is IN the card schema — the clone already contains it. The floor for a static CHILD: zero marginal work.',
        mount: (parent) => mountRows(EXO_BACKEND, LIST_INLINE, parent),
    },
    {
        name: 'inline·twin',
        what: 'a second, separately declared, identical card — the null control, whose true difference from `inline` is zero.',
        mount: (parent) => mountRows(EXO_BACKEND, LIST_INLINE_TWIN, parent),
    },
    {
        name: 'static',
        what: 'the subtree is createExoStatic() in a children port, placed with c.one() — a second instance, schema, clone and insert per card, and NO wire call (wire is null).',
        mount: (parent) => mountRows(EXO_BACKEND, LIST_STATIC, parent),
    },
    {
        name: 'empty·wire',
        what: 'the same child behind a FRESH () => {} instead of a null wire — prices the per-instance call armExoNode skips for a static component.',
        mount: (parent) => mountRows(EXO_BACKEND, LIST_WIRED, parent),
    },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE GATE — markup AND text, after the mount, before anything is timed.
// ═══════════════════════════════════════════════════════════════════════════════════════════

function gateText(stage: string, who: string, reference: HTMLElement, subject: HTMLElement): void {
    const want = reference.textContent ?? '';
    const got = subject.textContent ?? '';
    if (want === got) {
        line(`gate one-and-static/${who} @ ${stage}: identical text — ${want.length} chars`);
        return;
    }
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    refuse(
        `one-and-static: ${who} produces different TEXT from the reference @ ${stage} ` +
            `(${want.length} vs ${got.length} chars, first difference at ${at}) — ` +
            `reference "…${want.slice(Math.max(0, at - 20), at + 40)}…" against ` +
            `"…${got.slice(Math.max(0, at - 20), at + 40)}…"`
    );
}

function gate(): void {
    // ── TABLE 1: one mount per program, compared against the FLOOR. ─────────────────────────
    const ref = el();
    const refOff = TABLE1[0].mount(ref);
    line(
        `TABLE 1 reference (${TABLE1[0].name}): ${markupOf(ref).length} chars, ` +
            `${ref.querySelectorAll('*').length} elements, ${CARDS} cards`
    );
    for (let i = 1; i < TABLE1.length; i++) {
        const p = TABLE1[i];
        const c = el();
        const off = p.mount(c);
        gateMarkup('one-and-static', 'mount', p.name, ref, c);
        gateText('mount', p.name, ref, c);
        off();
        c.remove();
    }
    refOff();
    ref.remove();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE CLOCK, OBSERVED — copied from `keystroke-floor`, which copied it from `mount-floor`.
// Spin until the clock moves and keep the SMALLEST step it ever takes.
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

function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

interface Phase {
    readonly name: string;
    /** Scenarios per timed region — what the batch multiplies. */
    readonly reps: number;
    /** Units per scenario: CARDS. */
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

export function benchmarkOneAndStatic(rounds = 100, batch = 1): void {
    const f4 = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    /** Nanoseconds, from a figure in milliseconds. Table 1's whole unit. */
    const ns = (ms: number): string => (ms * 1e6).toFixed(1);

    const quantum = observeTimerQuantum();
    line(
        `one-and-static: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run refuses that region by name'
    );

    line('');
    line('WHAT THE TWO ENTRY POINTS ARE — read off the files, before any number is printed');
    line("  createExoOne     DELETED FROM @exodra/core, and that deletion is this axis's answer.");
    line('             It was `{ component, props }` cast once — a TYPE CHECK, not a fast path —');
    line('             and props no longer exist anywhere in this library (a wire is');
    line('             `(enode, index)`). No door ever took a TExoOne: outside core the name');
    line('             appeared twice in the tree, both times as an UNUSED IMPORT. c.bindOne,');
    line('             TExoChildrenApi and the backend `children` field are gone with it, so no');
    line('             one-position door is left to price. TABLE 2 and its six rows are struck —');
    line('             see the file header for the list. NO REPLACEMENT TABLE IS OFFERED.');
    line('  createExoStatic  core/src/machine/factories/createExoStatic.ts:8  a machine with NO');
    line(
        '             PORTS whose two lists are the shared frozen EXO_NO_EFFECTS/HANDLERS, plus a refusal'
    );
    line('             that ships as EXO0019 (:17). Its `wire` is `null`, and');
    line('             armExoNode:9-10 READS that sentinel, so a static child really does');
    line('             skip a per-instance call. `empty·wire` below is the same child behind a');
    line('             FRESH () => {}, which pays one — that pair is what TABLE 1 prices.');

    line('');
    line('HOW A JOB WHOSE FLOOR IS ZERO IS REPORTED (decided before the run, not after it)');
    line("  A static child that is INLINE in its parent's schema costs no marginal work at all —");
    line('  the clone already contains it. There is no denominator, so TABLE 1 PRINTS NO RATIO.');
    line('  Its published figure is an ABSOLUTE: nanoseconds per static child, as');
    line('  (row − inline) × 1e6 / CARDS, both terms measured rows of the same table.');

    line('');
    gate();

    line('');
    line('CENSUS — counted off the schemas and the floors, nothing measured');
    line(`  TABLE 1  cards per mount            ${CARDS}, one static child each`);
    line(`           mounts per timed region    ${MOUNT_REPS * Math.max(1, batch)}`);
    line(
        `           static children per region ${MOUNT_REPS * CARDS * Math.max(1, batch)} — ` +
            'every per-child figure is that region DIVIDED, not a measurement'
    );
    line(`           the static subtree         ${FOOTER_MARKUP}`);
    line('  TABLE 2  STRUCK — createExoOne is deleted and no door takes its place');

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLE 1 — THE STATIC CHILD
    // ═══════════════════════════════════════════════════════════════════════════════════════

    const mountPhases: readonly Phase[] = TABLE1.map((p) => ({
        name: p.name,
        reps: MOUNT_REPS * Math.max(1, batch),
        per: CARDS,
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

    const mountSeries = runPhases(mountPhases, rounds);
    const mountStat = new Map<string, Stat>();
    for (const p of mountPhases) mountStat.set(p.name, stat(mountSeries.get(p.name) as number[]));
    const perCard = (name: string): number => (mountStat.get(name) as Stat).median;
    /** ms per MOUNT of CARDS cards — what the clock check and the per-child subtraction use. */
    const perMount = (name: string): number => perCard(name) * CARDS;

    const mountNull = pairedNull(
        mountSeries.get('inline') as number[],
        mountSeries.get('inline·twin') as number[]
    );
    /**
     * The resolution floor in the unit TABLE 1 publishes. `runPhases` already divided every
     * sample by `reps × per`, so `resolution` is milliseconds PER CARD and this is one conversion.
     */
    const mountResolutionNs = mountNull.resolution * 1e6;

    line('');
    line('TABLE 1 — A STATIC CHILD. ms per 200-card mount, and the ABSOLUTE per-child cost.');
    line('  row            ms/mount     ns/card     ns per STATIC CHILD    what it is');
    for (const p of mountPhases) {
        const ms = perMount(p.name);
        const child =
            p.name === 'inline' || p.name === 'native'
                ? '        —          '
                : `${ns(perCard(p.name) - perCard('inline')).padStart(10)}          `;
        line(
            `  ${p.name.padEnd(13)}${f4(ms).padStart(9)}${ns(perCard(p.name)).padStart(12)}` +
                `  ${child}${p.what}`
        );
    }
    line('');
    line(
        '  `inline·twin` CARRIES A PER-CHILD FIGURE TOO, and it is the instrument reading its own ' +
            'zero: the twin adds no child, so whatever appears in that column for it is what this ' +
            'run cannot tell apart from nothing. Read the other two rows against it, not against 0.'
    );
    line(
        `  resolution floor: ${f6(mountResolutionNs)} ns per card ` +
            `(bias ${f6(mountNull.bias * 1e6)} ns, round-to-round noise ` +
            `${f6(mountNull.noise * 1e6)} ns) — a per-child figure under this is not a size`
    );
    line(
        '  NO RATIO IS PRINTED AND NONE MAY BE QUOTED: the floor for a static child is zero ' +
            'marginal work.'
    );
    line(
        `  native against inline: ${f4(perMount('native'))} against ${f4(perMount('inline'))} ` +
            `ms per mount — a comparison of two whole programs, NOT a rung; a clone is neither ` +
            'structurally faster nor slower than createElement and no refusal is attached.'
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TABLE 2 — STRUCK. SIX ROWS, AND WHAT EACH PRICED, SO THE GAP IS NAMED RATHER THAN HIDDEN.
    // ═══════════════════════════════════════════════════════════════════════════════════════

    line('');
    line('TABLE 2 — STRUCK WHOLE. Every row built a createExoOne pair, and that function,');
    line('TExoOne, c.bindOne, TExoChildrenApi and the backend `children` field are all deleted');
    line('from the library. The six struck rows and what each priced:');
    line('  driver        the bare notification: setValue into a bindable with a no-op subscriber');
    line("  driver·twin   the same program under a second name — that table's null control");
    line('  native·swap   THE FLOOR for a swap: removeChild, createElement, appendChild, by hand');
    line('  bindOne       the THEN-SHIPPED single position — c.bindOne over the children');
    line('                reconciler; neither door exists now');
    line('  one·slot      THE STRATEGY: a reconciler that knew its region held at most one child');
    line('  swap·same     the documented "per notification that changes nothing: NOTHING AT ALL"');
    line(
        'NO REPLACEMENT TABLE. No one-position door is left to price, so the honest state of that'
    );
    line('question is that it HAS NO MECHANISM — not that it has a slower one.');

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // THE REFUSALS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    // ── THE LADDER MUST NEST, TABLE 1. `static` and `empty·wire` do everything `inline` does and
    //    then build a second instance per card, so a row under `inline` makes the subtraction the
    //    whole table is built on NEGATIVE.
    for (const name of ['static', 'empty·wire']) {
        const diff = perCard(name) - perCard('inline');
        if (diff >= -mountNull.resolution) continue;
        refuse(
            `one-and-static: "${name}" (${ns(perCard(name))} ns/card) measured CHEAPER than ` +
                `"inline" (${ns(perCard('inline'))} ns/card) by ${ns(-diff)} ns, past the ` +
                `resolution floor (${f6(mountResolutionNs)} ns), though it builds a second ` +
                'instance, resolves a second schema, clones a second subtree and inserts it. That ' +
                'is not a saving, it is the instrument — the per-static-child column is a ' +
                'NEGATIVE number and unreadable. Raise `rounds`, then the batch.'
        );
    }

    // ── THE CLOCK, PER REGION.
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
                `one-and-static: the "${p.name}" ${table} region is ${region.toFixed(3)} ms at ` +
                    `${p.reps}×${p.per} — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                    `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                    `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                    '`npm run axis --workspace=@exodra/benchmarks -- one-and-static ' +
                    `${rounds} ${wantBatch}\``
            );
        }
    };
    checkClock(mountPhases, perCard, 'MOUNT');

    // ── AND WHAT NO NUMBER ON THIS PAGE COVERS, printed every run so it cannot be forgotten
    //    between reading the table and quoting it.
    line('');
    line(
        'WHAT THIS RUN DID NOT MEASURE: the SERVER (`createExoStatic` on a zero-port schema collapses ' +
            'to arity zero in @exodra/string — that number belongs in `ssr-floor`); a static child ' +
            'DEEPER than one level; a static child inside a RECONCILED list rather than a fixed ' +
            'one; memory, layout, style and paint — every region above ends at the last DOM ' +
            'mutation, before the browser does anything with it; and ANY single-position question ' +
            'at all, which has no mechanism left in the library to measure.'
    );
}
