// TWO AXES, ONE FILE — `refetch` and `pagination`. Both REPLACE the whole list with a fresh
// array of fresh objects, and they differ in exactly one respect, which is the whole point:
//
//   refetch    — the SAME N ids come back (the server re-sent the page), as NEW objects, with
//                one field changed. A renderer that recognises the rows patches N texts.
//   pagination — a DIFFERENT N ids arrive (the user clicked "next"), so every field changes.
//                A renderer that recognises rows recognises NOTHING and rebuilds all N.
//
// THEY HAVE OPPOSITE WINNERS, and that is why they are worth having as a pair rather than as
// one "list replace" axis. On `refetch`, keying by an EXTRACTED KEY (React's `key={r.id}`) reuses
// every node while keying by ITEM IDENTITY (Solid's `<For>`, and this repository's reconciler)
// recognises nothing, because every object is new. On `pagination` the extracted key stops
// helping — the ids really are different — and the only strategies that keep the nodes are the
// POSITIONAL ones: React's unkeyed `.map()`, Solid's `<Index>`, and a fixed list of slots here.
//
// WHY THIS FILE EXISTS AT ALL. The hypothesis was that React, precisely because its unkeyed
// list is positional, can beat renderers that are faster everywhere else on a full replace over a
// big DOM — it rewrites texts where they destroy and rebuild subtrees. That hypothesis was
// UNMEASURABLE in this suite: it has no replace axis, and every React participant in it is keyed
// (`reconcile.tsx:251`, `list-reconcile.tsx:269`, `reactive-update.tsx:240`, `toggle.tsx:1865`).
// So the shape it predicts a win for had never been run.
//
// WHAT THE MECHANISM ACTUALLY IS, read out of react-dom 19.2.8 rather than assumed.
// `reconcileChildrenArray`'s first loop runs `while (oldFiber !== null && newIdx < newChildren
// .length)` and breaks ONLY when `updateSlot` returns `null` — which happens on a key mismatch or
// a type mismatch. An unkeyed child has `key === null` on both sides, `null === null` passes
// (the production bundle's compare is at `:3516`/`:3520`), so the loop walks the whole array in
// place. A LENGTH CHANGE DOES NOT BREAK THE REUSE: a shorter array exits with
// `newIdx === newChildren.length` and calls `deleteRemainingChildren`; a longer one exits with
// `oldFiber === null` and appends through `createChild`. Only an insertion in the MIDDLE, or a
// changed element type, drops it to `mapRemainingChildren`.
//
// ── SOLID IS HERE TWICE, AND IT HAS TO BE ─────────────────────────────────────────────────────
// `<Index>` is exactly the same idea as an unkeyed React list — one row per POSITION, the item
// delivered as a signal — and solid-js 1.9.13 ships it. An axis that ran `react·unkeyed` against
// `solid·for` and reported "React wins" would be publishing a result about a feature Solid has
// and was never asked for. So both of Solid's list blocks run, and both of React's.
//
// ── THE FLOOR, AND WHY THERE ARE TWO OF THEM ──────────────────────────────────────────────────
// A floor bounds a FIXED JOB, and this axis contains two different jobs:
//
//   `floor`         — the positional job. N `<li>` built once, their four Text nodes cached in
//                     arrays, and an op writes `.data` where the string differs. This is what a
//                     hand-written program does when it knows row `i` stays row `i`. Every
//                     positional participant is bounded by it.
//   `floor·rebuild` — the rebuild job. The `<ul>` is emptied and N fresh rows are cloned from a
//                     module-level prototype. This is what a hand-written program does when it
//                     has been told nothing about the relationship between old and new data, and
//                     it is the honest bound for every participant that destroys and recreates.
//
// The `.data !== next` guard in `floor` is not a trick to flatter it: it is what makes `refetch`
// cost N writes instead of 2N, and every participant here that patches in place gets the same
// saving for free — the slot source's `setValue` dedupes on `===` (`createExoBenchSource.ts`), React
// skips an unchanged text child, and Solid's per-position memo does not re-run. Naming it is the
// point; hiding it would be the trick.
//
// `floor·twin` is a BYTE-FOR-BYTE second copy of `floor` under a second name. Its true difference
// from `floor` is zero by construction, so the gap between their two medians is what this run can
// actually resolve — without it, `--only`'s verdict may print a ratio and must not print a pass.
//
// ── WHAT IS NOT HERE, SAID OUT LOUD RATHER THAN OMITTED ───────────────────────────────────────
// Mikado and Lit are absent from this first cut. Mikado's `recycle` mode and Lit's `.map()` (as
// against `repeat()`) are both positional strategies that belong in this table, and Mikado in
// particular is the participant this suite's other list axes argue hardest for including. They
// are a second pass, not a decision that they would lose.
import { createSignal, For, Index } from 'solid-js';
import { createElement as rc, useState } from 'react';
import { abBench, type Scenario, type AbContract } from '../../../harness';
import { gateMarkup } from '../../gates/markup-gate';
// Package specifiers — the schema core is measured out of its `dist`, never out of src.
import { type TExoSchemaCursor, type TExoTextPort, type TExoChildrenPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import { ExoDomBackend, type TExoDomNode, withExoChildList, withExoCompiler } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
} from '@exodra/core';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

// 500 rows, because the hypothesis under test is specifically about a BIG dom: it predicts that
// avoiding N subtree constructions outweighs everything a faster renderer does per row, and the
// construction cost is what grows with N. 10 replaces per measured batch puts every participant
// far above the browser's ~0.1 ms timer clamp.
const N = 500;
const OPS = 10;

type TRow = { readonly id: number; readonly name: string; readonly meta: string };

// `refetch`'s names are the SAME STRINGS every time — interned once here, so "this field did not
// change" is true by value for every participant, and the axis measures the one field that did.
const REFETCH_NAMES: readonly string[] = Array.from({ length: N }, (_, i) => `Row ${i}`);

/** The same N ids, as fresh objects, with `meta` bumped. Nothing else moves. */
function refetchPage(version: number): TRow[] {
    const out: TRow[] = new Array(N);
    for (let i = 0; i < N; i++) {
        out[i] = { id: i, name: REFETCH_NAMES[i], meta: `#${i} · v${version}` };
    }
    return out;
}

/** A different N ids entirely — page `p` holds `p*N … p*N+N-1`, so every field differs. */
function paginationPage(page: number): TRow[] {
    const out: TRow[] = new Array(N);
    const base = page * N;
    for (let i = 0; i < N; i++) {
        const id = base + i;
        out[i] = { id, name: `Row ${id}`, meta: `#${id} · p${page}` };
    }
    return out;
}

/**
 * ONE ROW EDITED, AND THE DIFF IS GIVEN ITS BEST POSSIBLE SHOT.
 *
 * THE QUESTION THIS ANSWERS, put after reading `refetch`: if only ONE row of a 500-row
 * list needs to change, is tearing the whole list down and rebuilding it from a template still
 * cheaper than diffing? `refetch` cannot answer it — there every one of the 500 objects is new and
 * every one of the 500 `meta` strings differs, so a diff has 500 changes to find and apply. Here
 * it has one.
 *
 * IDENTITY IS PRESERVED ON PURPOSE, and that is what makes this the diff's best case rather than a
 * rigged one. `BASE[i]` is the SAME object in every page it appears in, so a reconciler that
 * recognises rows by item identity (`reconcileExoOrder`, Solid's `<For>`) matches 499 of 500 with
 * a pointer compare, and one that recognises them by an extracted key (React's `key={r.id}`) matches
 * all 500 because the ids never change. If a full rebuild still wins HERE, it wins everywhere on
 * this shape; if the diff wins here and nowhere else, then the diff pays for itself exactly when
 * the data layer preserved identity — which is a finding either way.
 *
 * EXACTLY ONE ROW DIFFERS BETWEEN CONSECUTIVE PAGES, and the edits ACCUMULATE so that it stays
 * exactly one. `page(k)` holds the edited object at every index below `k` and the base object at
 * every index from `k` up, so stepping from `page(k)` to `page(k+1)` changes index `k` and nothing
 * else. A scheme that edited index `k` alone would change TWO rows per step — the previous edit
 * reverting and the next one applying — and this axis would then be measuring two.
 */
const BASE_ROWS: readonly TRow[] = Array.from({ length: N }, (_, i) => ({
    id: i,
    name: `Row ${i}`,
    meta: `#${i} · v0`,
}));
const EDITED_ROWS: readonly TRow[] = BASE_ROWS.map((r) => ({
    id: r.id,
    name: r.name,
    meta: `#${r.id} · edited`,
}));

function oneRowPage(k: number): TRow[] {
    const out: TRow[] = new Array(N);
    for (let i = 0; i < N; i++) out[i] = i < k ? EDITED_ROWS[i] : BASE_ROWS[i];
    return out;
}

// ── THE DOM-OP CENSUS ─────────────────────────────────────────────────────────────────────────
//
// WHAT EACH PARTICIPANT ACTUALLY DID TO THE DOCUMENT ON ONE REPLACE, counted rather than argued.
//
// The survivor census beside it answers "did the nodes stay", which is a question about the END
// STATE. It cannot tell apart two participants that both kept all 500 rows and wrote a different
// number of texts to get there — and on `refetch`, where half the fields did not change, that is
// precisely the difference between the participants at the top of the table. I had written "the
// same 1000 writes the floor does" into this file's header as an assertion; this counts it.
//
// IT PATCHES PROTOTYPES AND PUTS THEM BACK IN A `finally`, and it runs strictly OUTSIDE every
// timed region — a patched `Text.data` setter would be measuring the patch. The counts are
// therefore from a run that no median in this file comes from, which is the honest arrangement:
// the census says what the work IS, the table says what it costs.
interface DomOps {
    /** Assignments to `Text.data` / `Node.nodeValue` / `Node.textContent` (the last also clears). */
    textWrites: number;
    createElement: number;
    /** `appendChild` + `insertBefore`, i.e. every node put into a parent. */
    inserts: number;
    removes: number;
}

function countDomOps(run: () => void): DomOps {
    const ops: DomOps = { textWrites: 0, createElement: 0, inserts: 0, removes: 0 };
    const charProto = CharacterData.prototype as unknown as object;
    const dataDesc = Object.getOwnPropertyDescriptor(charProto, 'data')!;
    const textDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!;
    const nodeValDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue')!;
    const origCreate = Document.prototype.createElement;
    const origAppend = Node.prototype.appendChild;
    const origInsert = Node.prototype.insertBefore;
    const origRemove = Node.prototype.removeChild;
    try {
        Object.defineProperty(charProto, 'data', {
            ...dataDesc,
            set(this: CharacterData, v: string) {
                ops.textWrites++;
                dataDesc.set!.call(this, v);
            },
        });
        Object.defineProperty(Node.prototype, 'textContent', {
            ...textDesc,
            set(this: Node, v: string) {
                ops.textWrites++;
                textDesc.set!.call(this, v);
            },
        });
        Object.defineProperty(Node.prototype, 'nodeValue', {
            ...nodeValDesc,
            set(this: Node, v: string) {
                ops.textWrites++;
                nodeValDesc.set!.call(this, v);
            },
        });
        Document.prototype.createElement = function (this: Document, ...args: [string]) {
            ops.createElement++;
            return origCreate.apply(this, args) as HTMLElement;
        } as typeof origCreate;
        Node.prototype.appendChild = function <T extends Node>(this: Node, n: T): T {
            ops.inserts++;
            return origAppend.call(this, n) as T;
        };
        Node.prototype.insertBefore = function <T extends Node>(
            this: Node,
            n: T,
            ref: Node | null
        ) {
            ops.inserts++;
            return origInsert.call(this, n, ref) as T;
        };
        Node.prototype.removeChild = function <T extends Node>(this: Node, n: T): T {
            ops.removes++;
            return origRemove.call(this, n) as T;
        };
        run();
    } finally {
        Object.defineProperty(charProto, 'data', dataDesc);
        Object.defineProperty(Node.prototype, 'textContent', textDesc);
        Object.defineProperty(Node.prototype, 'nodeValue', nodeValDesc);
        Document.prototype.createElement = origCreate;
        Node.prototype.appendChild = origAppend;
        Node.prototype.insertBefore = origInsert;
        Node.prototype.removeChild = origRemove;
    }
    return ops;
}

// ── THE NATIVE FLOORS ─────────────────────────────────────────────────────────────────────────

interface Mounted {
    update(rows: readonly TRow[]): void;
    destroy(): void;
}

/**
 * THE POSITIONAL FLOOR — N rows built once, their Text nodes held in two arrays, an op writing
 * `.data` only where the string differs. No framework, no diff, no keys, no allocation per op.
 *
 * IT KEEPS ITS OWN SHADOW OF THE LAST VALUE (`lastName`/`lastMeta`) AND COMPARES AGAINST THAT,
 * not against `Text.data`, and the difference is not a detail. The first version of this floor
 * asked `nt.data !== r.name`, which is a DOM PROPERTY READ per row per field; measured on the
 * first run of this axis it put the floor at 1.400 ms against `exodra·positional`'s 0.800 —
 * a "strategy 1.75× below the floor" that was nothing of the kind. Every participant that patches
 * in place keeps its previous value in JS and compares there (the slot source's `setValue` dedupes on
 * `===` before touching anything), so a floor that goes back to the DOM for it is doing strictly
 * more work than the programs it is supposed to bound. Two arrays of strings is what the
 * hand-written program actually looks like.
 */
function mountFloor(rows: readonly TRow[], host: HTMLElement): Mounted {
    const ul = document.createElement('ul');
    const nameText: Text[] = new Array(N);
    const metaText: Text[] = new Array(N);
    const lastName: string[] = new Array(N);
    const lastMeta: string[] = new Array(N);
    for (let i = 0; i < N; i++) {
        const li = document.createElement('li');
        li.className = 'row';
        const nameEl = document.createElement('span');
        nameEl.className = 'name';
        const nt = document.createTextNode(rows[i].name);
        nameEl.appendChild(nt);
        const metaEl = document.createElement('span');
        metaEl.className = 'meta';
        const mt = document.createTextNode(rows[i].meta);
        metaEl.appendChild(mt);
        li.appendChild(nameEl);
        li.appendChild(metaEl);
        ul.appendChild(li);
        nameText[i] = nt;
        metaText[i] = mt;
        lastName[i] = rows[i].name;
        lastMeta[i] = rows[i].meta;
    }
    host.appendChild(ul);
    return {
        update(next: readonly TRow[]): void {
            for (let i = 0; i < N; i++) {
                const r = next[i];
                const nextName = r.name;
                if (lastName[i] !== nextName) {
                    lastName[i] = nextName;
                    nameText[i].data = nextName;
                }
                const nextMeta = r.meta;
                if (lastMeta[i] !== nextMeta) {
                    lastMeta[i] = nextMeta;
                    metaText[i].data = nextMeta;
                }
            }
        },
        destroy(): void {
            ul.remove();
        },
    };
}

/**
 * THE REBUILD FLOOR — empty the parent and clone N fresh rows from a prototype. Compiled once,
 * at module scope, for the same reason Mikado's template and the schema core's port numbering
 * are: a runtime compile inside a measured region would be timing a compiler.
 */
const ROW_PROTO = (() => {
    const li = document.createElement('li');
    li.className = 'row';
    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.appendChild(document.createTextNode(''));
    const metaEl = document.createElement('span');
    metaEl.className = 'meta';
    metaEl.appendChild(document.createTextNode(''));
    li.appendChild(nameEl);
    li.appendChild(metaEl);
    return li;
})();

function fillRebuilt(into: Node, rows: readonly TRow[]): void {
    for (let i = 0; i < N; i++) {
        const li = ROW_PROTO.cloneNode(true) as HTMLElement;
        const r = rows[i];
        (li.firstChild!.firstChild as Text).data = r.name;
        (li.lastChild!.firstChild as Text).data = r.meta;
        into.appendChild(li);
    }
}

/**
 * HOW A REBUILD GETS THE OLD ROWS OUT, AND HOW IT PUTS THE NEW ONES IN — three combinations, and
 * they exist to price one question with a number instead of an opinion: what would BATCHING the
 * removals and the insertions be worth?
 *
 * THE CORE DOES NEITHER TODAY, and the census is what says so. On a replace with no survivors the
 * diff falls to its general arm: every departing child leaves through `dropExoChild` — one
 * `removeChild` each — and every new one arrives through `placeExoChildren` — one `insertBefore`
 * each. Counted on `pagination`: 500 removes and 500 inserts per replace, against this floor's
 * 500 inserts and NO removes, because it empties the parent with one assignment. The core already
 * OWNS that assignment (`clearOwnedExoChildList`, `parent.textContent = ''`), and it is reachable from
 * exactly two places — the shrink arm of the position-only fast path and the `remove` op. A full
 * replace is neither.
 *
 * SO THE PRICE IS MEASURED HERE, WITH NO FRAMEWORK IN THE WAY. Three floors identical except for
 * these two decisions, so each gap is exactly one decision wide:
 *
 *   `floor·rebuild`          — `textContent = ''`, then append each row into the live parent.
 *   `floor·rebuild·drop1by1` — `removeChild` per row, then the same appends. Its gap to the row
 *                              above is what 500 individual removals cost.
 *   `floor·rebuild·fragment` — `textContent = ''`, then build into a `DocumentFragment` and cross
 *                              into the live parent ONCE. Its gap to `floor·rebuild` is what
 *                              batching the INSERTIONS is worth, in the same program.
 *
 * A CEILING IS NOT A SAVING. Each gap bounds what the matching change could return AT BEST, in a
 * program carrying none of the core's bookkeeping. What the core would actually keep is a
 * different measurement, and this axis does not claim it.
 */
type ClearMode = 'batch' | 'one-by-one';
type FillMode = 'direct' | 'fragment';

function mountFloorRebuild(
    rows: readonly TRow[],
    host: HTMLElement,
    clear: ClearMode,
    fill: FillMode
): Mounted {
    const ul = document.createElement('ul');
    fillRebuilt(ul, rows);
    host.appendChild(ul);
    return {
        update(next: readonly TRow[]): void {
            if (clear === 'batch') {
                ul.textContent = '';
            } else {
                // `lastChild`, not `firstChild`: removing from the front makes every call shift
                // the survivors behind it, and a floor that picked the losing end of its own loop
                // would be pricing the loop rather than the decision under test.
                while (ul.lastChild !== null) ul.removeChild(ul.lastChild);
            }
            if (fill === 'fragment') {
                const frag = document.createDocumentFragment();
                fillRebuilt(frag, next);
                ul.appendChild(frag);
            } else {
                fillRebuilt(ul, next);
            }
        },
        destroy(): void {
            ul.remove();
        },
    };
}

// ── THE SCHEMA CORE, TWICE ────────────────────────────────────────────────────────────────────

/** `<li class="row"><span class="name">…</span><span class="meta">…</span></li>` — the reference. */
function rowSchema(b: TExoSchemaCursor): { name: TExoTextPort; meta: TExoTextPort } {
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
}

/**
 * THE DEFAULT — one component per ITEM, written into the list by `reconcileExoOrder`, which
 * recognises a survivor with `===` on the item object. Every array this axis hands it is freshly
 * allocated, so on BOTH axes it recognises nothing and rebuilds all N rows. That is not a bug being
 * measured: it is the cost of reconciling by identity when the data layer did not preserve identity,
 * and naming that cost is what makes the positional row below a STRATEGY rather than a consolation.
 */

const ITEM_ROW_SCHEMA = createExoSchema((b) => rowSchema(b));
const mITEM_ROW = createExoMachine(ITEM_ROW_SCHEMA, {
    createInitialState: (c: TExoDomNode, row: TRow) => {
        c.text(ITEM_ROW_SCHEMA.ports.name, row.name);
        c.text(ITEM_ROW_SCHEMA.ports.meta, row.meta);
    },
});
const ITEM_ROW = mITEM_ROW;

/**
 * THE POSITIONAL STRATEGY, written with today's API and nothing added to the library.
 *
 * A SLOT is a permanent object per POSITION holding two sources. The list of slots never
 * changes, so it goes through `list` — «a FIXED list of instances — rendered once, never
 * reconciled, nothing subscribed» — and each row subscribes its two texts to its own slot. A
 * replace is then N pairs of `setValue`, and `setValue` returns without notifying when the value
 * is `===` to the previous one, so `refetch` writes the DOM once per row and `pagination` twice.
 *
 * This is the composition a user writes when they know their list is a PAGE: fixed length,
 * position-addressed, contents swapped wholesale. Nothing about it is private to this file.
 */
type TSlot = {
    readonly name: TExoBenchSource<string>;
    readonly meta: TExoBenchSource<string>;
};

const SLOT_ROW_SCHEMA = createExoSchema((b) => rowSchema(b));
const mSLOT_ROW = createExoMachine(SLOT_ROW_SCHEMA, {
    createInitialState: (_c: TExoDomNode, slot: TSlot) => slot,
});
const SLOT_ROW = composeExoMachine(
    mSLOT_ROW,
    (m) =>
        withExoTransitions(m, {
            showSlotName: (c) => {
                c.text(SLOT_ROW_SCHEMA.ports.name, c.state.name.getValue());
            },
            showSlotMeta: (c) => {
                c.text(SLOT_ROW_SCHEMA.ports.meta, c.state.meta.getValue());
            },
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                showSlotName(c);
                return c.state.name.onChange(() => showSlotName(c));
            });
            effect((c) => {
                showSlotMeta(c);
                return c.state.meta.onChange(() => showSlotMeta(c));
            });
        })
);
const { showSlotName, showSlotMeta } = SLOT_ROW.transitions;

// ── THE AXIS BODY, shared by both exported benchmarks ─────────────────────────────────────────

interface AxisSpec {
    /** `refetch` / `pagination` — used in every gate message and in the table title. */
    readonly axis: string;
    readonly title: string;
    /** Page 0 is what everything mounts with; `page(k)` is the k-th replace. */
    readonly page: (k: number) => TRow[];
    /**
     * HOW MANY OF THE ORIGINAL `<li>` NODES EACH PARTICIPANT MUST STILL HOLD after `OPS` replaces.
     * Declared, and checked, because the census is the whole discriminator of this axis: a
     * participant that quietly started rebuilding — or quietly started reusing — would otherwise
     * change what its row MEANS while the number kept looking plausible.
     */
    readonly survivors: Readonly<Record<string, number>>;
    readonly contracts: readonly AbContract[];
    /**
     * WHICH ROWS THIS TABLE SAMPLES. Omitted means all of them, which is what `refetch` and
     * `pagination` want. `rewire` names a subset, because its question is diff-against-rewire and
     * a twelve-row table repeated five times would bury it.
     */
    readonly participants?: readonly string[];
    /**
     * HOW MANY REPLACES ONE TIMED SAMPLE PERFORMS. Defaults to `OPS`.
     *
     * IT EXISTS BECAUSE THE BROWSER'S CLOCK IS CLAMPED AT ~0.1 ms AND THE FIRST `rewire` RUN HIT
     * IT. At k=1 the four fastest rows all printed a median of 0.000 and the report divided by
     * them, which prints `Infinity×` — not a ranking, the quantum thirteen times over. A row
     * whose real cost is below the tick cannot be measured by taking more ROUNDS (each sample is
     * still one tick) — only by putting more work inside one sample. This is that knob, and it is
     * per spec rather than global so `refetch` and `pagination`, whose rows are all far above the
     * tick already, keep the exact scenario they were recorded with.
     */
    readonly ops?: number;
    /**
     * THE POSITIONS WHOSE CONTENT CHANGES BETWEEN CONSECUTIVE PAGES — declared by the spec, and
     * the ONE thing `exodra·targeted` is given that no other participant here gets.
     *
     * IT IS NOT A CHEAT, AND THE REASON MATTERS: this is what a store HANDS YOU. `@oimdb/core`
     * publishes a per-entity update, `cnstra` drains a queue of them — a real data layer knows
     * which rows moved and says so, and the whole point of the row is to price acting on that
     * knowledge against re-deriving it with a diff. A participant given it is answering a
     * DIFFERENT and SMALLER question than one handed a bare array, and the tables below say so
     * on every line rather than letting the median imply otherwise.
     *
     * Absent, and the row is not offered at all.
     */
    readonly changedAt?: readonly number[];
}

/**
 * ONE OR MORE TABLES, sharing every participant and every gate.
 *
 * IT TAKES A LIST because `rewire` prints FIVE tables — one per number of changed positions — and
 * the alternative was a second copy of nine participants in a second function. This file's header
 * already argues why that is the thing to avoid: a participant copied is a gate that can soften in
 * one copy while the other still reads correct. Everything spec-independent is built once, above
 * the loop; everything a spec decides — its pages, its mounters, its census, its table — is built
 * per spec inside it.
 */
async function runListReplace(
    specs: readonly AxisSpec[],
    rounds: number,
    batch: number
): Promise<void> {
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');

    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };

    /**
     * EVERY PAGE THIS AXIS WILL EVER SHOW, BUILT ONCE, BEFORE ANYTHING IS TIMED.
     *
     * The first version of this axis called `spec.page(++page)` INSIDE the measured region, so
     * every participant's timing included allocating 500 objects and 1000 strings per replace.
     * That is a constant added to all nine rows — the floor included — and a constant added to
     * both sides of a comparison does not cancel out of a RATIO: it drags every ratio toward
     * 1.00 and makes the floor look dearer than the DOM work it actually does. Measured on the
     * first recorded run (`.gate/pagination.v1.json`), `exodra·positional` read 1.33× of the
     * floor with the allocation inside; that number was flattering the strategy.
     *
     * `PAGES[0]` is what everything mounts with; `PAGES[1…OPS]` are the replaces, in that order,
     * for every participant and every round. Fixed rather than drifting with a counter, so two
     * rounds of the same participant do identical work.
     *
     * REUSING THE SAME ARRAYS ACROSS ROUNDS CHANGES NO PARTICIPANT'S BEHAVIOUR, and that has to
     * be true rather than hoped: what any of them recognises is decided between CONSECUTIVE
     * pages, and consecutive pages here share no row object and no id on either axis. The one
     * thing a fresh allocation per round would add is the allocation itself, which is exactly
     * what is being taken out.
     */
    for (const spec of specs) {
        const ops = spec.ops ?? OPS;
        const PAGES: readonly TRow[][] = Array.from({ length: ops + 1 }, (_, k) => spec.page(k));
        const PAGE0 = PAGES[0];

        // --- schema core, default: reconcileExoOrder over fresh objects ----------
        const mountExodra = (host: HTMLElement, rows: TExoBenchSource<readonly TRow[]>) => {
            const UL_SCHEMA = createExoSchema((b) => {
                let port!: TExoChildrenPort;
                b.el('ul', null, (ul) => {
                    port = ul.childrenPort();
                });
                return { rows: port };
            });
            const mUL = createExoMachine(UL_SCHEMA, {
                createInitialState: (cc: TExoDomNode) => ({
                    kids: cc.childList(UL_SCHEMA.ports.rows),
                    shown: [] as TRow[],
                }),
            });
            const UL = composeExoMachine(
                mUL,
                (m) =>
                    withExoTransitions(m, {
                        showRows: (cc) => {
                            const state = cc.state;
                            const want = rows.getValue();
                            state.shown = reconcileExoOrder(
                                state.kids,
                                state.shown,
                                want,
                                want,
                                (item) => cc.build(ITEM_ROW, item)
                            );
                        },
                    }),
                (m) =>
                    withExoEffects(m, (effect) => {
                        effect((cc) => {
                            showRows(cc);
                            return rows.onChange(() => showRows(cc));
                        });
                    })
            );
            const { showRows } = UL.transitions;
            return EXO_BACKEND.render(UL, host);
        };

        // --- schema core, positional: a fixed list of N permanent slots -------------
        // Solid's counterpart of `TSlot`: a permanent pair of signals per POSITION. Solid's setter
        // dedupes an equal write with the same `===` test the slot source's `setValue` uses, so neither
        // strategy is given a saving the other lacks.
        type SolidSlot = {
            readonly name: ReturnType<typeof createSignal<string>>;
            readonly meta: ReturnType<typeof createSignal<string>>;
        };
        const makeSolidSlots = (rows: readonly TRow[]): SolidSlot[] =>
            rows.map((r) => ({ name: createSignal(r.name), meta: createSignal(r.meta) }));

        const makeSlots = (rows: readonly TRow[]): TSlot[] =>
            rows.map((r) => ({
                name: createExoBenchSource(r.name),
                meta: createExoBenchSource(r.meta),
            }));

        const mountExodraPositional = (host: HTMLElement, slots: readonly TSlot[]) => {
            const UL_SCHEMA2 = createExoSchema((b) => {
                let port!: TExoChildrenPort;
                b.el('ul', null, (ul) => {
                    port = ul.childrenPort();
                });
                return { rows: port };
            });
            const mUL2 = createExoMachine<TExoDomNode>(UL_SCHEMA2, {
                createInitialState: (cc) => {
                    cc.list(UL_SCHEMA2.ports.rows, SLOT_ROW, slots);
                },
            });
            const UL = mUL2;
            return EXO_BACKEND.render(UL, host);
        };

        const writeSlots = (slots: readonly TSlot[], next: readonly TRow[]): void => {
            for (let i = 0; i < N; i++) {
                const r = next[i];
                const s = slots[i];
                s.name.setValue(r.name);
                s.meta.setValue(r.meta);
            }
        };

        // --- Solid, both list blocks ------------------------------------------------
        const SolidFor = (props: { rows: () => TRow[] }) => (
            <ul>
                <For each={props.rows()}>
                    {(r) => (
                        <li class="row">
                            <span class="name">{r.name}</span>
                            <span class="meta">{r.meta}</span>
                        </li>
                    )}
                </For>
            </ul>
        );
        const SolidIndex = (props: { rows: () => TRow[] }) => (
            <ul>
                <Index each={props.rows()}>
                    {(r) => (
                        <li class="row">
                            <span class="name">{r().name}</span>
                            <span class="meta">{r().meta}</span>
                        </li>
                    )}
                </Index>
            </ul>
        );

        /**
         * SOLID'S HAND-WRITTEN POSITIONAL STRATEGY — the exact analogue of `exodra·positional`, and
         * the row without which this axis would not be publishable.
         *
         * `exodra·positional` is not a feature of this repository's renderer: it is a COMPOSITION a
         * user writes — a permanent object per position holding its own sources, a list rendered once,
         * and each text bound to its own source. Every fine-grained framework can express exactly
         * that, so a table that showed our composition against Solid's `<For>` and `<Index>` alone
         * would be comparing a hand-tuned strategy against two defaults and calling the gap ours.
         *
         * IT IS A PLAIN `.map()`, DELIBERATELY, and that is the whole trick in both frameworks: `<For>`
         * and `<Index>` subscribe to the ARRAY, and this subscribes to nothing. The array never
         * changes, so the list is rendered once and no list machinery runs on an update at all —
         * Solid's compiler turns each `{s.name[0]()}` into its own text effect, which is the same
         * shape as this core following one source per text port.
         *
         * THE SIGNALS ARE READ THROUGH THEIR GETTERS INSIDE THE JSX, not lifted into locals, because
         * lifting them would read them once at render time and produce a dead list.
         */
        const SolidSlots = (props: { slots: readonly SolidSlot[] }) => (
            <ul>
                {props.slots.map((s) => (
                    <li class="row">
                        <span class="name">{s.name[0]()}</span>
                        <span class="meta">{s.meta[0]()}</span>
                    </li>
                ))}
            </ul>
        );

        // --- React, both list blocks ------------------------------------------------
        const reactRow = (r: TRow, keyed: boolean) =>
            rc(
                'li',
                keyed ? { key: r.id, className: 'row' } : { className: 'row' },
                rc('span', { className: 'name' }, r.name),
                rc('span', { className: 'meta' }, r.meta)
            );
        const ReactList = ({ rows, keyed }: { rows: TRow[]; keyed: boolean }) =>
            rc(
                'ul',
                null,
                rows.map((r) => reactRow(r, keyed))
            );

        // ── MOUNTERS, one uniform shape, so the gates below can drive every participant
        //    through the same three questions without knowing which one it is holding.
        type Mounter = (host: HTMLElement) => Mounted;

        const mounters: Readonly<Record<string, Mounter>> = {
            floor: (host) => mountFloor(PAGE0, host),
            'floor·twin': (host) => mountFloor(PAGE0, host),
            'floor·rebuild': (host) => mountFloorRebuild(PAGE0, host, 'batch', 'direct'),
            'floor·rebuild·drop1by1': (host) =>
                mountFloorRebuild(PAGE0, host, 'one-by-one', 'direct'),
            'floor·rebuild·fragment': (host) => mountFloorRebuild(PAGE0, host, 'batch', 'fragment'),
            exodra: (host) => {
                const rows = createExoBenchSource<readonly TRow[]>(PAGE0);
                const dispose = mountExodra(host, rows);
                return {
                    update: (next) => rows.setValue(next),
                    destroy: () => dispose(),
                };
            },
            'exodra·positional': (host) => {
                const slots = makeSlots(PAGE0);
                const dispose = mountExodraPositional(host, slots);
                return {
                    update: (next) => writeSlots(slots, next),
                    destroy: () => dispose(),
                };
            },
            'solid·for': (host) => {
                const [rows, setRows] = createSignal(PAGE0);
                const d = render(() => SolidFor({ rows }) as never, host);
                return { update: (next) => setRows(next as TRow[]), destroy: () => d() };
            },
            // `exodra·ops` IS STRUCK: there is no door that applies an item-op without re-reading or
            // diffing. The list transition takes any notification as a bare "it moved", re-reads
            // `getValue()` and diffs, so the row would be the same program as `exodra` under a
            // second name.

            // TOLD WHAT CHANGED. Same slots, same components, same DOM — the only difference from
            // `exodra·positional` is that this one writes `changedAt.length` slots instead of all
            // `N`. It exists to separate two costs the positional row charges together: the DISPATCH
            // (a `setValue` per field, whether or not the value moved) and the WRITE.
            'exodra·targeted': (host) => {
                const slots = makeSlots(PAGE0);
                const dispose = mountExodraPositional(host, slots);
                const at = spec.changedAt ?? [];
                return {
                    update: (next) => {
                        for (let j = 0; j < at.length; j++) {
                            const i = at[j];
                            const r = next[i];
                            slots[i].name.setValue(r.name);
                            slots[i].meta.setValue(r.meta);
                        }
                    },
                    destroy: () => dispose(),
                };
            },
            'solid·slots': (host) => {
                const slots = makeSolidSlots(PAGE0);
                const d = render(() => SolidSlots({ slots }) as never, host);
                return {
                    update: (next) => {
                        for (let i = 0; i < N; i++) {
                            slots[i].name[1](next[i].name);
                            slots[i].meta[1](next[i].meta);
                        }
                    },
                    destroy: () => d(),
                };
            },
            'solid·index': (host) => {
                const [rows, setRows] = createSignal(PAGE0);
                const d = render(() => SolidIndex({ rows }) as never, host);
                return { update: (next) => setRows(next as TRow[]), destroy: () => d() };
            },
            'react·keyed': (host) => makeReact(host, true),
            'react·unkeyed': (host) => makeReact(host, false),
        };

        function makeReact(host: HTMLElement, keyed: boolean): Mounted {
            const root = createRoot(host);
            let setRows: (v: TRow[]) => void = () => {};
            const App = () => {
                const [rows, s] = useState(PAGE0);
                setRows = s;
                return rc(ReactList, { rows, keyed });
            };
            flushSync(() => root.render(rc(App)));
            return {
                update: (next) => flushSync(() => setRows(next as TRow[])),
                destroy: () => root.unmount(),
            };
        }

        // ── GATES ─────────────────────────────────────────────────────────────────────────────────
        //
        // THREE QUESTIONS PER PARTICIPANT, and every one of them has to be asked AFTER the replaces
        // rather than only at mount, because everything this axis is about happens on the replace.
        //
        //  1. Does it build the reference's exact bytes, at mount and after `OPS` replaces? A timing
        //     comparison between renderers that do not build the same tree is worthless.
        //  2. How many of the ORIGINAL `<li>` nodes are still in the document? This is the axis's
        //     discriminator and it is DECLARED per participant, not assumed uniform: on `pagination`
        //     the positional participants must keep all N and the rebuilding ones must keep none, and
        //     a participant that drifted either way would otherwise keep a plausible-looking number
        //     while measuring a different program.
        //  3. Does the final text actually read the last page? A participant that reused every node
        //     and forgot to write it would score beautifully and render the wrong data.
        const reference = el();
        const refMounted = mounters.floor(reference);
        for (let k = 1; k <= ops; k++) refMounted.update(PAGES[k]);
        const referenceAfter = reference.innerHTML;
        refMounted.destroy();
        reference.remove();

        const chosen =
            spec.participants ?? Object.keys(mounters).filter((n) => n !== 'exodra·targeted');
        for (const name of chosen) {
            const refHost = el();
            const ref = mounters.floor(refHost);
            const subHost = el();
            const sub = mounters[name](subHost);

            gateMarkup(spec.axis, 'as mounted', name, refHost, subHost);

            const born = new Set<Element>(Array.from(subHost.querySelectorAll('li')));
            for (let k = 1; k <= ops; k++) {
                const next = PAGES[k];
                ref.update(next);
                sub.update(next);
            }
            gateMarkup(spec.axis, `after ${ops} replaces`, name, refHost, subHost);

            // ONE MORE REPLACE, COUNTED. It is the (OPS+1)-th page rather than a repeat of the last
            // one, so nothing is deduped that would not be deduped in the measured loop, and it
            // happens after the markup gates so a miscount can never mask a wrong tree.
            const census = countDomOps(() => sub.update(spec.page(ops + 1)));
            // eslint-disable-next-line no-console
            console.log(
                // `✅`, because `run-one-axis.js` forwards a console line only when it carries a
                // `✅` or a `❌` — anything else is swallowed and never reaches a recording. It sits
                // in front of the table, beside the gates, so no row pattern can read it as data.
                `✅ census ${spec.axis}/${name}: per replace of ${N} rows — ` +
                    `${census.textWrites} text writes · ${census.createElement} createElement · ` +
                    `${census.inserts} inserts · ${census.removes} removes`
            );
            // Back onto the last page, so the markup comparison below is against the same page the
            // reference is on.
            sub.update(PAGES[ops]);

            const live = Array.from(subHost.querySelectorAll('li'));
            const survivors = live.filter((li) => born.has(li)).length;
            const finalHtml = subHost.innerHTML;

            ref.destroy();
            refHost.remove();
            sub.destroy();
            subHost.remove();

            const want = spec.survivors[name];
            if (survivors !== want) {
                throw new Error(
                    `${spec.axis}: ${name} kept ${survivors} of ${N} original row nodes across ` +
                        `${ops} replaces, and this axis declares ${want}. Either the participant ` +
                        'changed strategy or the declaration is stale — the two rows of this table ' +
                        'mean different things and the medians are not comparable until it is settled.'
                );
            }
            if (finalHtml !== referenceAfter) {
                throw new Error(
                    `${spec.axis}: ${name} ends on different markup from the native floor fired ` +
                        'through the same pages — it reused nodes without writing the last page into ' +
                        'them, which would score well and render the wrong data'
                );
            }
            // eslint-disable-next-line no-console
            console.log(
                `✅ gate ${spec.axis}/${name}: ${survivors}/${N} original row nodes survived ` +
                    `${ops} replaces (declared ${want}), and the final markup is the floor's byte for ` +
                    'byte'
            );
        }

        const prep =
            (name: string): (() => Scenario) =>
            (): Scenario => {
                const host = el();
                const m = mounters[name](host);
                return {
                    measure: () => {
                        for (let o = 1; o <= ops; o++) m.update(PAGES[o]);
                    },
                    cleanup: () => {
                        m.destroy();
                        host.remove();
                    },
                };
            };

        await abBench(
            spec.title,
            `ms/${ops} replaces of ${N} rows`,
            Object.fromEntries(chosen.map((n) => [n, prep(n)])) as never,
            { rounds, batch, contracts: spec.contracts }
        );
    }
}

// ── REFETCH ───────────────────────────────────────────────────────────────────────────────────

export async function benchmarkRefetch(rounds = 60, batch = 1): Promise<void> {
    await runListReplace(
        [
            {
                axis: 'refetch',
                title:
                    `REFETCH — the same ${N} ids re-delivered as fresh objects with one field ` +
                    `changed, ×${OPS}`,
                page: (k) => refetchPage(k),
                // React's `key={r.id}` still matches, so it reuses; its unkeyed list reuses
                // positionally; `<Index>` is positional; the slots never move. `<For>` keys by the
                // ITEM VALUE and every object is new, so it rebuilds — and so does our reconciler, for
                // exactly the same reason.
                survivors: {
                    floor: N,
                    'floor·twin': N,
                    'floor·rebuild': 0,
                    'floor·rebuild·drop1by1': 0,
                    'floor·rebuild·fragment': 0,
                    exodra: 0,
                    'exodra·positional': N,
                    'react·keyed': N,
                    'react·unkeyed': N,
                    'solid·for': 0,
                    'solid·index': N,
                    'solid·slots': N,
                },
                contracts: [
                    {
                        name: 'reuse',
                        floors: ['floor', 'floor·twin'],
                        members: [
                            'exodra·positional',
                            'solid·slots',
                            'react·keyed',
                            'react·unkeyed',
                            'solid·index',
                        ],
                        evidence:
                            'SETTLED BY CENSUS, not by name: the gate above proved each of these ' +
                            `members still holds all ${N} original <li> nodes after ${OPS} replaces, ` +
                            'which is the same job the floor does — patch the text of rows that ' +
                            'already exist.',
                        resolutionPair: ['floor', 'floor·twin'],
                    },
                    {
                        name: 'rebuild',
                        // THREE CANDIDATES, AND THE CHEAPEST PRESENT WINS — the harness's own rule,
                        // so a batching decision that turns out to beat the nominated floor becomes
                        // the floor without anybody editing this list.
                        floors: [
                            'floor·rebuild',
                            'floor·rebuild·fragment',
                            'floor·rebuild·drop1by1',
                        ],
                        members: ['exodra', 'solid·for'],
                        evidence:
                            'SETTLED BY CENSUS: both keep 0 of the original nodes, so their job is ' +
                            `to destroy ${N} rows and build ${N} more — which is what floor·rebuild ` +
                            'does with no renderer around it.',
                        resolutionPair: ['floor', 'floor·twin'],
                    },
                ],
            },
        ],
        rounds,
        batch
    );
}

// ── PAGINATION ────────────────────────────────────────────────────────────────────────────────

export async function benchmarkPagination(rounds = 60, batch = 1): Promise<void> {
    await runListReplace(
        [
            {
                axis: 'pagination',
                title: `PAGINATION — a full replace with ${N} DIFFERENT ids per page, ×${OPS} pages`,
                page: (k) => paginationPage(k),
                // The ids really are different now, so an extracted key stops rescuing React's keyed
                // list: every key is new, every row is destroyed and rebuilt. Only the POSITIONAL
                // strategies keep their nodes.
                survivors: {
                    floor: N,
                    'floor·twin': N,
                    'floor·rebuild': 0,
                    'floor·rebuild·drop1by1': 0,
                    'floor·rebuild·fragment': 0,
                    exodra: 0,
                    'exodra·positional': N,
                    'react·keyed': 0,
                    'react·unkeyed': N,
                    'solid·for': 0,
                    'solid·index': N,
                    'solid·slots': N,
                },
                contracts: [
                    {
                        name: 'reuse',
                        floors: ['floor', 'floor·twin'],
                        members: [
                            'exodra·positional',
                            'solid·slots',
                            'react·unkeyed',
                            'solid·index',
                        ],
                        evidence:
                            `SETTLED BY CENSUS: each still holds all ${N} original <li> nodes after ` +
                            `${OPS} page switches, so each is doing the floor's job — rewrite the ` +
                            'text of rows that already exist.',
                        resolutionPair: ['floor', 'floor·twin'],
                    },
                    {
                        name: 'rebuild',
                        // THREE CANDIDATES, AND THE CHEAPEST PRESENT WINS — the harness's own rule,
                        // so a batching decision that turns out to beat the nominated floor becomes
                        // the floor without anybody editing this list.
                        floors: [
                            'floor·rebuild',
                            'floor·rebuild·fragment',
                            'floor·rebuild·drop1by1',
                        ],
                        members: ['exodra', 'react·keyed', 'solid·for'],
                        evidence:
                            'SETTLED BY CENSUS: all three keep 0 of the original nodes. Note that ' +
                            'react·keyed is in THIS contract on this axis and in `reuse` on ' +
                            'refetch — the key stops helping the moment the ids really change.',
                        resolutionPair: ['floor', 'floor·twin'],
                    },
                ],
            },
        ],
        rounds,
        batch
    );
}

// ── REWIRE ────────────────────────────────────────────────────────────────────────────────────

/**
 * THE CROSSOVER: at how many changed rows does RE-WRITING EVERY POSITION become cheaper than
 * DIFFING to find out which ones moved?
 *
 * ANDREY'S QUESTION, and the reason it is worth a whole axis: `pagination` showed that on a FULL
 * replace, re-wiring (1.000) beats the diff (6.500) by 6.5× — but a full replace is the diff's
 * worst case, where it walks 500 rows to discover that all 500 are new. The opposite extreme is
 * one changed row, where the diff walks 500 and does one thing. Somewhere between them the two
 * costs cross, and nothing in this suite says where.
 *
 * THE PREVIOUS ANSWER WAS ARITHMETIC ACROSS TWO AXES AND IS WITHDRAWN. It divided `list-update`'s
 * 0.815 ms / 80 ops on 300 rows by `pagination`'s 0.100 ms / 1000 writes on 500 rows and put the
 * crossover near six rows. Two axes, two list sizes, two op counts, two recordings — the harness
 * says in its own header that an absolute median may not be carried between runs, and dividing two
 * of them is worse than carrying one. This axis measures it inside a single run instead.
 *
 * ── THREE STRATEGIES, AND THE THIRD IS THE ONE THE QUESTION IS REALLY ABOUT ────────────────────
 *   `exodra`            — hand it a fresh array and let it reconcile. O(n) scan, and it rebuilds
 *                         every row whose object changed, because it recognises rows by identity.
 *   `exodra·positional` — write ALL n positions and let `setValue` drop the ones that did not
 *                         move. O(n) dispatch, O(k) DOM. No diff runs at all.
 *   `exodra·targeted`   — write only the k positions that changed. O(k) dispatch, O(k) DOM.
 *                         It is handed the changed positions, which is what a store hands you and
 *                         what a bare array does not carry — see `AxisSpec.changedAt`.
 *
 * The gap between the middle row and the bottom one is the price of NOT being told: 2(n − k)
 * `setValue` calls that compare, find nothing, and return.
 *
 * ── THE CHANGED ROWS ARE SPREAD, NOT CLUSTERED ────────────────────────────────────────────────
 * `k` positions spaced evenly across the list, because a run of k adjacent changes at the HEAD is
 * precisely what `reconcileExoOrder`'s head trim walks straight past — and
 * measuring the crossover on the shape that skips most of the work would answer a question nobody
 * asked. Spread rows make the skip fail k times, which is where a scattered store update lands.
 *
 * IDENTITY IS PRESERVED FOR THE UNCHANGED ROWS: `BASE_ROWS[i]` is the same object in every page,
 * so the diff matches n − k rows with a pointer compare and only the k changed ones are new. That
 * is the diff's best case, deliberately.
 */
const K_SWEEP: readonly number[] = [1, 5, 25, 100, 500];

/**
 * 200 REPLACES PER SAMPLE, not the file's default 10, and the SAME 200 for every k so the five
 * tables can be read against each other.
 *
 * The first run of this axis took the default and printed 0.000 for the four fastest rows at
 * k=1 and k=5 — the browser's ~0.1 ms clock quantum, not a measurement. Twenty times the work
 * inside one sample puts every row of every table above the tick; nothing else about the
 * scenario changes, and the unit printed beside each table says `ms/200 replaces` so no number
 * here can be pasted beside one from `refetch` or `pagination`.
 */
const REWIRE_OPS = 200;

/** `k` positions spread evenly over the list — `{ floor(j·N/k) }`, deterministic. */
function spreadPositions(k: number): number[] {
    const out: number[] = new Array(k);
    for (let j = 0; j < k; j++) out[j] = Math.floor((j * N) / k);
    return out;
}

/**
 * Page `step` for a sweep of `k`: the `k` spread positions carry a FRESH object whose `meta`
 * names the step, every other position carries its permanent `BASE_ROWS` object. Consecutive
 * pages therefore differ at exactly those `k` positions and nowhere else.
 */
function rewirePage(k: number, step: number): TRow[] {
    const at = spreadPositions(k);
    const out: TRow[] = BASE_ROWS.slice();
    for (let j = 0; j < at.length; j++) {
        const i = at[j];
        out[i] = { id: i, name: BASE_ROWS[i].name, meta: `#${i} · s${step}` };
    }
    return out;
}

export async function benchmarkRewire(rounds = 40, batch = 1): Promise<void> {
    await runListReplace(
        K_SWEEP.map((k) => ({
            axis: `rewire·k${k}`,
            title:
                `REWIRE — ${k} of ${N} row(s) changed per replace, spread evenly, ×${REWIRE_OPS} ` +
                '(diff vs write-all vs write-only-what-changed)',
            page: (step: number) => rewirePage(k, step),
            ops: REWIRE_OPS,
            changedAt: spreadPositions(k),
            participants: [
                'floor',
                'floor·twin',
                'floor·rebuild',
                'exodra',
                'exodra·positional',
                'exodra·targeted',
                'solid·for',
                'solid·slots',
                'react·keyed',
            ],
            // `exodra` and `solid·for` recognise a row by its ITEM, and the k changed positions
            // carry a new object every step, so each of them destroys and rebuilds exactly those
            // k rows per replace — the same k every time, since the positions are fixed. React's
            // key is the id, which never changes, so it reuses everything. Everything positional
            // keeps everything.
            survivors: {
                floor: N,
                'floor·twin': N,
                'floor·rebuild': 0,
                exodra: N - k,
                'exodra·positional': N,
                'exodra·targeted': N,
                'solid·for': N - k,
                'solid·slots': N,
                'react·keyed': N,
            },
            contracts: [
                {
                    name: 'reuse',
                    floors: ['floor', 'floor·twin'],
                    members: ['exodra·targeted', 'exodra·positional', 'solid·slots', 'react·keyed'],
                    evidence:
                        `SETTLED BY CENSUS: each holds all ${N} original <li> nodes after ` +
                        `${REWIRE_OPS} replaces, so each is doing the floor's job — rewrite ` +
                        'the text of ' +
                        'rows that already exist.',
                    resolutionPair: ['floor', 'floor·twin'],
                },
                {
                    name: 'rebuild',
                    floors: ['floor·rebuild'],
                    members: ['exodra', 'solid·for'],
                    evidence:
                        `SETTLED BY CENSUS: both drop the ${k} row(s) whose item object changed ` +
                        'and build replacements, so their job includes construction, which the ' +
                        'positional rows never do.',
                    resolutionPair: ['floor', 'floor·twin'],
                },
            ],
        })),
        rounds,
        batch
    );
}
