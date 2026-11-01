// AXIS 2 — LIST UPDATE: targeted list mutations, each framework using its OWN
// idiomatic API. Solid / Svelte / React have no imperative list API, so a mutation is a
// state-set their keyed list block must diff; Mikado does have one, and is measured both ways.
// Mount 300 rows (untimed), then TIME 20 rounds of {move, insert, remove, append} = 80
// operations.
//
// `exodra` is the Exodra core shipped as `@exodra/core` + `@exodra/dom`, and it is on the
// DECLARATIVE side of this axis, with Solid / Svelte / React / voby. That is not a handicap
// chosen for it: it has no imperative list API at all. A reactive list is a transition calling
// `reconcileExoOrder` over `c.childList(port)`, fired by an effect on every notification of the
// source, which re-reads `getValue()` and diffs it — so the only thing a caller can say to a list
// is what it now holds.
//
// `exodraTold` is the second Exodra row: the same shell, with each op applied to
// `c.childList(port)` by index from a transition, and nothing diffed.
//
// `marko` joins the DECLARATIVE side for the same reason, and the argument for putting it
// there rather than on the imperative side is written out in `marko/MkList.marko` next to the
// template itself. The short of it: Marko 6 exposes no imperative list API to be measured on
// — `marko/dom`'s only collection entry points are the compiler's `_for_*` loop signals,
// which take the whole iterable and reconcile it, and a mounted template's entire outside
// surface is `update(input)` / `destroy()` / `value`. There is no handle on a rendered row,
// so "row 0 moved to 150" cannot be said to Marko at all; only the new array can.
//
// `mikado` GOES ON THE IMPERATIVE SIDE, AND THAT IS THE LOUD PART OF THIS FILE. Mikado is the
// only third-party participant with a real imperative list API, and the reason it is worth
// saying at volume is that this axis's headline number is "told-what-changed vs frameworks that
// must diff" — a comparison that would quietly exclude the one rival which does not have to. It
// is not excluded here. A Mikado view IS a list: it owns its root's children, keeps them in a
// `dom` array beside the DOM, and exposes (mikado/src/mikado.js, mikado/src/helper.js)
//
//     add(data, index)        insert one item at a position          mikado.js:1150
//     remove(index, count)    drop items at a position               mikado.js:1513
//     move(node|i, position)  move one node to an absolute position  helper.js:17
//     shift(node|i, offset)   move one node by a relative offset     helper.js:51
//     before / after / swap / up / down / first / last               helper.js
//     node(i) / index(node)   the handle on a rendered row           mikado.js:1626
//
// so "row 0 moved to 150" IS sayable to Mikado, and saying it is what this row measures.
//
// THE IMPERATIVE ROW IS MEASURING A DIFFERENT CONTRACT FROM THE DECLARATIVE ONE: it is told WHAT
// CHANGED and never compares anything. So Mikado appears TWICE here — `mikado` advanced by those ops,
// and `mikadoKeyed` handed the new array through `render()` and left to reconcile it against its
// keyed live-pool. Neither number means much without the other, and quoting the imperative one
// against Solid/React/Svelte/voby/marko would be quoting two different programs.
//
// `lit` JOINS THE DECLARATIVE SIDE, and — unlike Mikado above — that is not a placement chosen
// for it. The whole of `lit-html/directives/` was read before concluding it: the list directives
// (`repeat`, `map`, `join`, `range`) all take the WHOLE iterable and produce the whole list, and
// the one thing in Lit that resembles a mutation API — `lit-html/directive-helpers.js`'s
// `insertPart` / `removePart` / `clearPart` / `setChildPartValue` — takes a `ChildPart`, which is
// only ever handed out inside a `Directive`'s `update()`. There is no route from a rendered
// `<li>` back to the part that owns it, so "row 0 moved to 150" is not sayable to Lit either;
// those four are the pieces `repeat()` itself is written out of (it imports exactly them), and
// reaching for them from application code would mean re-implementing `repeat()` with a mutation
// API bolted on. It is keyed by `r.id` through `repeat()`'s key function — the same row identity
// everyone else keys by — and the full argument is in `participants/lit/list.tsx`.
//
// ── WHAT EACH ROW IS TOLD AT THE START OF A TIMED REGION ──────────────────────────────────────
//
// `update-floor`'s two words are used here unchanged, because this axis is where its `told` floor
// was taken from:
//
//   told    handed exactly what changed — an index, and for two of the four ops an item. The row
//           never sees an array of rows, and compares nothing.
//   derive  handed the new STATE — one fresh 300-element array per op — and left to work out for
//           itself which rows moved, joined or left.
//
//   row              contract  what arrives at the start of a timed region
//   mikado           told      view.shift(0,150) · view.add(item,75) · view.remove(200) ·
//                              view.add(item)             — 4 calls, 2 items, no array
//   exodra           derive    rows.setValue(data.slice())          — a new 300-array per op
//   exodra·twin      derive    the same, from a SECOND declaration of the same program
//   solid            derive    setRows([...data])
//   svelte           derive    inst.setRows([...data]) then flushSync()
//   react            derive    flushSync(() => setRows([...data]))
//   voby             derive    rows([...data]) then tick()
//   marko            derive    inst.update({ rows: data.slice() }) then run()
//   mikadoKeyed      derive    view.render(data.slice())
//   lit              derive    render() of `repeat(rows, r => r.id, …)` over data.slice()
//   stage0           derive    reconcile(parent, previously-rendered array, data.slice(), create)
//   uhtml            derive    the whole array in a hole, committed by `udomdiff`
//   sinuous          derive    `map()` over the new array, reconciled by item identity
//
// SO THERE IS ONE HEADLINE ON THIS AXIS AND `mikado` IS NOT PART OF IT: `exodra` against
// solid/svelte/react/voby/marko/mikadoKeyed/lit/stage0/uhtml/sinuous is derive-against-derive, and
// that is the whole of what this table compares. `mikado` is told what changed and compares
// nothing, so its row stands alone — there is no longer an Exodra row of its contract to read it
// against, and reading it against a derive row is a comparison of two different programs.
//
// ── AND THIS AXIS IS MIKADO'S HOME GROUND, WHICH IS THE POINT OF RUNNING IT ────────────────────
//
// This is not a shape picked because it suits us. It is the shape MIKADO'S OWN REPOSITORY
// BENCHMARKS, and Mikado is strongest here. From `node_modules/mikado/README.md` — their claims,
// not our measurements, quoted so the choice of ground is on the record:
//
//   * its benchmark's task columns are `Create · Replace · Update · Order · Repaint · Add ·
//     Remove · Toggle · Clear` over a 100-item array (README "Benchmark Ranking (Rendering
//     Performance)"). `Order`, `Add` and `Remove` are three of the four ops this axis runs.
//   * its published Keyed Test Results put `mikado` at 134,262 ops/s on `Order` against `solid`'s
//     13,101, and at 93,062 against 4,595 on `Add` — an order of magnitude, on their numbers.
//   * it runs a third mode it calls "internal/data-driven" beside the keyed and non-keyed ones,
//     and it says of the helper functions this axis drives (`shift`/`add`/`remove`): "Mikado
//     provides you several optional helper functions to manipulate the DOM and also keep them in
//     sync with the internal view state. Using the helper functions also will gain performance."
//   * and it says out loud what most suites leave out: "The most benchmarks you will find ends at
//     the point where Mikado starts to shine."
//
// So the told side of this axis is Mikado's advertised strength, measured through the API Mikado's
// own documentation points at, and `exodraTold` is read against it.
//
// TWO COSTS THAT RIDE WITH THE CONTRACT AND ARE NOT THE HARNESS'S DOING, stated here rather than
// left to be discovered from a profile:
//   * EVERY row's timed region contains the plain-array mutation (`data.splice(…)`), because
//     `runOps` is literally the same function for all of them and the `mikado` row repeats it
//     inline. That part is common to every row and cancels out of every comparison.
//   * ONLY the derive rows pay the 300-element COPY (`data.slice()` / `[...data]`), 80 of them per
//     region. That does NOT cancel — and it is not a handicap the harness added: handing over a new
//     state IS the derive contract, and an application written against `reconcileExoOrder` over
//     a plain source pays exactly that copy in its own code.
//
// ── AND THE CLAMP, WHICH IS WHY THIS AXIS RUNS AT A BATCH ─────────────────────────────────────
//
// Chromium clamps `performance.now()` to ~0.1 ms. At batch 1 this axis's fastest rows read
// min 0.000 / median 0.100 / max 0.200 — zero, one and two TICKS, which is the clamp and not a
// measurement — and it went on to print a ratio whose denominator was one tick. It printed no scale
// line at all, which is how that survived; `toggle` and `machine-vs-cells` have printed theirs for
// months. Both halves are fixed below: `observeTimerQuantum` + `reportScale` in `toggle`'s shape,
// and `DEFAULT_BATCH` scenarios per timed region so the fast rows are read off a grid `batch` times
// finer. See `DEFAULT_BATCH` for the arithmetic that picked the number.
//
// It needs no app of its own: the list here is a `<ul>` of `<li>` rows, which is two
// components — a schema and its wiring in one value each — declared below next to the
// other participants' inline lists.
import { For, createSignal } from 'solid-js';
import { createElement as rc, useState } from 'react';
// Mikado is imported at module scope rather than awaited inside the benchmark like the other
// participants, because `Mikado.compile()` is the runtime compiler and its two templates below
// have to be compiled ONCE for the life of the process — the same deal Solid's compiler and the
// schema core's port numbering get, and never inside a measured region.
import Mikado from 'mikado';
import { abBench, type AbRow, type Scenario } from '../../../harness';
// The schema core ships now — the backend-agnostic half is `@exodra/core` and the DOM backend
// is `@exodra/dom` — so it is imported by package specifier and measured out of `dist`. Same
// reach `apps/exodra/exodra.tsx` makes; both need `npm run build` at the repo root to have run
// first.
import { type TExoChildrenPort, type TExoTextPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import { ExoDomBackend, type TExoDomNode, withExoChildList, withExoCompiler } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import { createExoMachineBuilder } from '@exodra/core';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/**
 * THE NULL PAIR'S BACKEND, and it has to be its own.
 *
 * A backend instance owns the compiled schema cache, so a twin sharing `EXO_BACKEND` would find the
 * reference's schema already built and would be measuring a warm cache against a cold one — a
 * systematic difference, which is the opposite of a null. `app-update`'s `exodra·twin` is given its
 * own backend for the same reason and says so in the same words.
 */
const EXO_BACKEND_TWIN = withExoChildList(withExoCompiler(new ExoDomBackend()));

const ROWS = 300;
const OP_ROUNDS = 20;
type Row = { id: number; text: string };

/**
 * HOW MANY INDEPENDENT SCENARIOS GO INSIDE ONE TIMED REGION, and the arithmetic that picked it.
 *
 * `abBench`'s `sampleOnce` builds `batch` scenarios, times all of their `measure()` calls in ONE
 * region and divides by `batch`. The printed figure stays per-scenario; what changes is that the
 * tick it was quantised at is worth `quantum / batch` of it. Nothing about any participant changes.
 *
 * THE NUMBERS THE CHOICE IS MADE FROM, and where each comes from — `.gate/list-update.latest.json`,
 * a batch-1 run recorded before any of this existed (that file carries `"quantum": null`, because
 * the axis printed no quantum line for the recorder to scrape):
 *
 *   observed quantum on this machine        0.100 ms
 *   mikado     min 0.000 · p25 0.100 · median 0.100 · p75 0.200 · max 0.200 — 0, 1 and 2 TICKS
 *   the floor this suite states             10 quanta (`MIN_TICKS`, `toggle`'s number)
 *
 *   from the PRINTED median          batch ≥ 10 × 0.100 / 0.100 = 10
 *   the printed median is ONE TICK, so it is an over-statement of the truth: `min` reaching 0.000
 *   says samples fall below the tick, and a median that lands on the tick rather than on zero puts
 *   the true per-scenario cost between roughly 0.05 and 0.10 ms. At the pessimistic end:
 *                                    batch ≥ 10 × 0.100 / 0.050 = 20
 *   chosen, with headroom for a build that gets faster:  32
 *
 * At 32 the per-scenario grid is 0.003125 ms, so a row at 0.05 ms reads 16 ticks and one at 0.09 ms
 * reads 28.8 — both above the floor, and `reportScale` prints the figure either way rather than
 * asking anyone to trust this paragraph. WHAT IT COSTS: 32 lists of 300 rows stand at once inside a
 * region — 9,600 elements, against the ~51,000 that `scripts/run-one-axis.js` records as the live
 * set `mount-floor` carries at its own recommended batch — and the axis takes roughly 32× longer,
 * because the untimed mount and teardown of each scenario scale with the batch as the region does.
 * At 100 rounds over thirteen rows that is minutes, not seconds; `list-update 40 32` buys the same
 * resolution with a coarser null and is the run to reach for when the machine is needed elsewhere.
 *
 * IT IS THE AXIS'S DEFAULT AND NOT THE RUNNER'S, deliberately: `scripts/run-one-axis.js` defaults
 * its own `batch` positional to 1 for every axis, so `list-update 100` — rounds given, batch
 * omitted — would force this axis back onto the clamp. `reportScale` REFUSES that run by name and
 * prints the exact batch that would clear it, so the trap is loud rather than silent.
 */
const DEFAULT_BATCH = 32;

/** How many observed quanta the fastest row must clear for the table to be worth reading. */
const MIN_TICKS = 10;

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
/** Printed, not thrown — the shape every axis here uses, so `run-one-axis.js` records it. */
// eslint-disable-next-line no-console
const refuseLine = (s: string): void => console.log(`❌ ${s}`);

/**
 * THE CLOCK'S REAL RESOLUTION, observed rather than assumed — `toggle.tsx`'s function verbatim.
 *
 * Chromium clamps `performance.now()` (~0.1 ms with the flags this suite launches with, finer with
 * cross-origin isolation, coarser under some privacy settings), and an axis whose fastest row sits
 * on that quantum has measured nothing at all — which is exactly what this axis did for its whole
 * life. So it is measured here, printed at the top of the run in the phrasing `run-one-axis.js`
 * scrapes into the recording, and used to judge the table at the bottom.
 *
 * HOW: spin until the clock actually moves and keep the smallest step it ever takes. Anything
 * smaller than the true quantum is impossible to observe; anything larger only appears if the loop
 * was descheduled, which is why the MINIMUM over many tries is the answer.
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
 * IS THIS TABLE A MEASUREMENT OR THE CLAMP, printed as its own line either way — `toggle.tsx`'s
 * `reportScale`, with its refusal pointed at the knob this axis actually has.
 *
 * The fastest row is the one at risk (everything else is above it), so it is the one judged. On a
 * failure the line says by what FACTOR the axis is short and what batch would clear it, because the
 * alternative — a reader deciding for themselves how much bigger is big enough — is how an axis
 * stays broken for a year.
 *
 * `batch` IS PART OF THE INSTRUMENT AND NOT DECORATION. `abBench` times `batch` scenarios in one
 * region and divides, so a per-scenario median of `m` was read off `batch × m` of clock. Judging
 * `m` against a raw quantum prices an instrument this run did not use, and at a large batch it
 * under-reports the resolution by that whole factor. Same correction `toggle`'s `reportScale` and
 * `reportFloor` carry.
 */
function reportScale(rows: readonly AbRow[], quantum: number, batch: number): void {
    line('');
    if (rows.length === 0) {
        refuseLine('scale list-update: the table above has no rows, so there is nothing to judge');
        return;
    }
    const fastest = rows[0];
    const perScenario = quantum / batch;
    const ticks = fastest.stat.median / perScenario;
    if (ticks >= MIN_TICKS) {
        line(
            `scale list-update: fastest row \`${fastest.name}\` median ` +
                `${fastest.stat.median.toFixed(3)} ms = ${ticks.toFixed(1)}× the per-scenario ` +
                `quantum (${perScenario.toFixed(4)} ms — the observed ${quantum.toFixed(3)} over ` +
                `batch ${batch}) — above the ${MIN_TICKS}× floor, so the ordering in the table ` +
                'above is resolvable'
        );
        return;
    }
    const wantBatch = ticks > 0 ? Math.ceil((batch * MIN_TICKS) / ticks) : batch * 100;
    refuseLine(
        `scale list-update: UNDER-SCALED, AND THIS TABLE IS NOT A RANKING. Fastest row ` +
            `\`${fastest.name}\` median ${fastest.stat.median.toFixed(3)} ms = ` +
            `${ticks.toFixed(1)}× the per-scenario quantum (${perScenario.toFixed(4)} ms — the ` +
            `observed ${quantum.toFixed(3)} over batch ${batch}), against a floor of ` +
            `${MIN_TICKS}×. A row sitting on the clamp is zero, one or two TICKS, so every ratio ` +
            `printed above it has a denominator of one tick and MUST NOT BE QUOTED. Re-run with ` +
            `batch ${wantBatch}: \`npm run axis --workspace=@exodra/benchmarks -- list-update ` +
            `100 ${wantBatch}\`. (The axis's own default is ${DEFAULT_BATCH}; a run that gave ` +
            'rounds but not batch got 1 from `scripts/run-one-axis.js` and landed here.)'
    );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE RESOLUTION FLOOR — what this run returns when the true difference is ZERO.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// The same two numbers `app-update`, `one-and-static`, `mount-floor`, `hydrate-floor` and
// `teardown-floor` print, computed the same way, so a reader who has seen one of those blocks has
// seen this one:
//
//   bias   |median(a) − median(b)|. On its own it is OPTIMISTIC: two medians are free to cancel,
//          and the first null this suite ever printed came out at 0.0000 for that reason alone.
//   noise  the MEDIAN of the per-round |a_r − b_r|. Both halves are sampled in the same round and
//          adjacent in the rotation, so this is the round-to-round scatter that ANY comparison of
//          two rows in this table carries. It cannot cancel.
//
// THIS AXIS CARRIES TWO PAIRS because it straddles two magnitudes — `mikado`, told what changed,
// sits near 0.1 ms and the derive rows near 1–9 ms — and a null taken at one end says nothing about
// the other, because scatter grows with the region it is taken on. `exodra`↔`exodra·twin` bounds the
// DERIVE side and `exodraTold`↔`exodraTold·twin` the TOLD side.

interface TNull {
    readonly bias: number;
    readonly noise: number;
    readonly noiseP75: number;
    readonly worst: number;
    readonly resolution: number;
}

function quantiles(xs: readonly number[]): { median: number; p75: number; max: number } {
    const s = [...xs].sort((a, b) => a - b);
    const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    return { median: q(0.5), p75: q(0.75), max: s[s.length - 1] };
}

function pairedNull(a: readonly number[], b: readonly number[]): TNull {
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    for (let r = 0; r < n; r++) diffs[r] = Math.abs(a[r] - b[r]);
    const d = quantiles(diffs);
    const bias = Math.abs(quantiles(a).median - quantiles(b).median);
    return {
        bias,
        noise: d.median,
        noiseP75: d.p75,
        worst: d.max,
        resolution: Math.max(bias, d.median),
    };
}

/**
 * WHAT THE TABLE ABOVE CAN AND CANNOT SAY, printed from the null pairs, in the axis's own unit.
 *
 * The block's SHAPE is the one `mount-floor` prints and `scripts/run-one-axis.js` scrapes
 * (`NULL_HEAD` / `NULL_ROW` / `NULL_RESOLUTION`), so this axis's recording carries its own
 * resolution instead of `"nulls": null` and a reader of the JSON can check any gap quoted from it.
 * `list-update` must be added to that file's `AXES_WITH_NULLS` or a recording that LOSES this block
 * goes unreported.
 */
function reportResolution(rows: readonly AbRow[], quantum: number, batch: number): void {
    const f = (x: number): string => x.toFixed(3);
    // SIX DECIMALS FOR THE NULL ONLY. Three is right for a row that takes a millisecond and wrong
    // for a quantity whose whole job is to be small — printed at three it reads `0.000`, which says
    // "perfect instrument" and means "not printed". Six is also what `NULL_ROW` matches on.
    const f6 = (x: number): string => x.toFixed(6);
    const at = (name: string): AbRow | undefined => rows.find((r) => r.name === name);

    const declared: readonly (readonly [string, string, string])[] = [
        ['exodra', 'exodra·twin', 'the DERIVE side — the contract every other row is read against'],
        ['exodraTold', 'exodraTold·twin', 'the TOLD side — the contract `mikado` runs'],
    ];
    const found = declared
        .map(([a, b, what]) => ({ a: at(a), b: at(b), an: a, bn: b, what }))
        .filter((p): p is { a: AbRow; b: AbRow; an: string; bn: string; what: string } => {
            return p.a !== undefined && p.b !== undefined;
        });
    if (found.length === 0) {
        refuseLine(
            'list-update: NO RESOLUTION — this run did not sample a null pair whole ' +
                '(`exodra`+`exodra·twin` or `exodraTold`+`exodraTold·twin`), so nothing here says ' +
                'how small a difference the instrument can see and NO GAP IN THE TABLE ABOVE MAY BE ' +
                'QUOTED AS A SIZE. Add a pair to --only, or run the full field.'
        );
        return;
    }

    const nulls = found.map((p) => ({ ...p, n: pairedNull(p.a.samples, p.b.samples) }));
    line('');
    line('THE CONTROLS — what this run resolved, from a pair whose true difference is ZERO');
    line('  null            bias      noise     p75       worst     what it is');
    for (const p of nulls) {
        line(
            `  ${p.an.padEnd(13)} ${f6(p.n.bias)}  ${f6(p.n.noise)}  ${f6(p.n.noiseP75)}  ` +
                `${f6(p.n.worst)}  |${p.an} − ${p.bn}|, true Δ = 0`
        );
    }
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. Each twin is a SECOND, SEPARATELY DECLARED `createExoMachineBuilder` row and shell on its ' +
            'own backend — its own declaration, its own port numbers, its own schema cache — fired ' +
            'by the same ops through its own source, so its true difference from the row it twins ' +
            'is zero BY CONSTRUCTION and whatever appears on that line is this instrument reading ' +
            'its own zero.'
    );
    const resolution = Math.max(...nulls.map((p) => p.n.resolution));
    const worstOf = nulls.reduce((w, p) => (p.n.resolution >= w.n.resolution ? p : w), nulls[0]);
    line(
        `  RESOLUTION FLOOR      ${f6(resolution)} ms = max(bias, noise) over ` +
            `${nulls.length === 1 ? 'the one pair present' : 'both pairs'}, set by ` +
            `\`${worstOf.an}\` (${worstOf.what}). ANY DIFFERENCE IN THE TABLE ABOVE SMALLER THAN ` +
            'THIS IS NOT A SIZE — at most an ordering, and one this run cannot defend. Read every ' +
            'gap against this figure and not against zero.'
    );
    // AND THE FLOOR READ AGAINST THE CLOCK, because the two can be confused and only one of them
    // is a property of this axis. A null smaller than the grid the samples were quantised at is
    // reporting the grid, not the instrument — the same reason `reportScale` above exists.
    const grid = quantum / batch;
    line(
        `  for scale: the per-scenario clock grid is ${grid.toFixed(4)} ms (observed quantum ` +
            `${quantum.toFixed(3)} over batch ${batch}); ` +
            nulls.map((p) => `\`${p.an}\` resolved ${f6(p.n.resolution)} ms`).join(' and ') +
            `. ${
                resolution <= grid
                    ? 'THE FLOOR IS AT OR UNDER THE GRID, so it is reporting the clock rather ' +
                      'than this axis, and every gap judged against it is judged loosely.'
                    : `The floor is ${(resolution / grid).toFixed(1)}× the grid, so it is a ` +
                      'property of this axis and not of the clock.'
            }`
    );
    if (at('mikado') !== undefined && at('exodraTold·twin') === undefined) {
        refuseLine(
            'list-update: NO CONTROL AT THE TOLD MAGNITUDE — `mikado` runs near a tenth of a ' +
                'millisecond and this run did not sample `exodraTold`+`exodraTold·twin`, so nothing ' +
                "here bounds `mikado`'s row or any gap read off it."
        );
    }

    // ── WHICH OF THIS TABLE'S OWN GAPS SURVIVE IT ───────────────────────────────────────────────
    //
    // `rows` arrives sorted fastest-first, so the adjacent pairs are the closest calls the table
    // makes. A pair inside the floor is a pair this run ranked and did not measure. A twin sits
    // adjacent to the row it twins by construction, so the null pair itself is skipped — listing it
    // would report the control as a finding.
    const twinOf = new Map<string, string>([
        ['exodra·twin', 'exodra'],
        ['exodraTold·twin', 'exodraTold'],
    ]);
    const isNullPair = (x: string, y: string): boolean =>
        twinOf.get(x) === y || twinOf.get(y) === x;
    const inside: string[] = [];
    for (let i = 1; i < rows.length; i++) {
        const lo = rows[i - 1].name;
        const hi = rows[i].name;
        if (isNullPair(lo, hi)) continue;
        const gap = rows[i].stat.median - rows[i - 1].stat.median;
        if (gap <= resolution) inside.push(`${lo}↔${hi} (${f(gap)} ms)`);
    }
    line(
        inside.length === 0
            ? '  every adjacent pair in the table above is separated by MORE than the floor, so ' +
                  'each of those gaps is a size this run can defend'
            : `  INSIDE THE FLOOR, therefore ORDERINGS AND NOT SIZES: ${inside.join(' · ')}`
    );

    // ── THE TOLD HEADLINE: `exodraTold` AGAINST `mikado`, both handed the index ─────────────────
    const told = at('exodraTold');
    const mik = at('mikado');
    const toldNull = nulls.find((p) => p.an === 'exodraTold');
    if (told !== undefined && mik !== undefined && toldNull !== undefined) {
        const gap = told.stat.median - mik.stat.median;
        line(
            Math.abs(gap) <= toldNull.n.resolution
                ? `  TOLD headline — exodraTold ${f(told.stat.median)} against mikado ` +
                      `${f(mik.stat.median)}: inside the told floor (${f6(
                          toldNull.n.resolution
                      )} ms), ` +
                      'an ordering and not a size'
                : `  TOLD headline — exodraTold ${f(told.stat.median)} against mikado ` +
                      `${f(mik.stat.median)} = ${(told.stat.median / mik.stat.median).toFixed(
                          2
                      )}×, ` +
                      `outside the told floor (${f6(toldNull.n.resolution)} ms)`
        );
    }

    // ── THE DERIVE HEADLINE: `exodra` AGAINST `stage0`, THE CEILING OF THAT SIDE ────────────────
    const ceiling = at('stage0');
    const exo = at('exodra');
    if (exo !== undefined && ceiling !== undefined) {
        const gap = exo.stat.median - ceiling.stat.median;
        const g = Math.abs(gap);
        line(
            g <= resolution
                ? `  DERIVE headline — exodra ${f(exo.stat.median)} against the stage0 ceiling ` +
                      `${f(ceiling.stat.median)}: ${f(g)} ms apart, INSIDE the floor ` +
                      `(${f6(resolution)} ms) — at the ceiling, with no side of it named.`
                : `  DERIVE headline — exodra ${f(exo.stat.median)} against the stage0 ceiling ` +
                      `${f(ceiling.stat.median)}: ${f(g)} ms ` +
                      `${gap > 0 ? 'ABOVE' : 'BELOW'} it, ${(g / resolution).toFixed(1)}× the ` +
                      'resolution floor. `stage0` is the ivi/Surplus LIS diff with no renderer ' +
                      'around it, and `reconcileExoOrder` runs the same LIS family over row ' +
                      'identity — so this gap is what the renderer costs on top of the diff, ' +
                      'never a framework recommendation.'
        );
    }
}

// --- the schema core's ROW: module scope, built once for the life of the process,
// because a declaration is the CONSTANT half of a component and rebuilding one per mount
// would re-number and re-compile a shape that has not changed. This is the one a reconcile
// clones, so it is the one that must not be rebuilt; the `<ul>` shell is built per
// scenario, in setup, because its wiring names that scenario's source (see below).
// A row's text never changes here — only its POSITION does — so this is `set`, not
// `bind`: the axis measures reconciling, and a per-row subscription nothing would ever
// fire is work the other participants do not do either.
// WHAT A ROW READS, BY INDEX. A wire is handed its position and nothing else, so the row the build
// callback is about to construct writes its item here an instant before `c.build` runs the wire.
const BUILDING: Row[] = [];
const BUILDING_TWIN: Row[] = [];

const LI_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', null, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mLI = createExoMachineBuilder<TExoDomNode>(LI_SCHEMA);
mLI.createInitialState((c, i) => {
    c.text(LI_SCHEMA.ports.text, BUILDING[i].text);
});
const LI = mLI.done();

/**
 * THE NULL PAIR'S ROW — a SECOND, SEPARATELY DECLARED `createExoMachineBuilder` of the same `<li>`.
 *
 * It is written out again rather than aliased to `LI`, and that is the whole point: an alias would
 * share one declaration, one set of port numbers and one compiled schema, so the "two" rows would
 * be one program measured twice and their difference would be zero by SHARING rather than by
 * construction. Written out, the twin is a second trip through `createExoMachineBuilder`, a second port
 * numbering and a second schema on a second backend — everything the reference does, done again —
 * so whatever separates the two rows in the table is the instrument and nothing else.
 *
 * It must stay byte-identical in what it RENDERS (`<li>text</li>`, filled with `set`, no
 * subscription), or it is not a null but an unannounced second experiment. The markup gate below
 * mounts both and compares, rather than trusting this paragraph.
 *
 * Module scope for the same reason `LI` is: a schema is the constant half of a component, and this
 * is the value a reconcile clones.
 */
const LI_TWIN_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', null, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mLI_TWIN = createExoMachineBuilder<TExoDomNode>(LI_TWIN_SCHEMA);
mLI_TWIN.createInitialState((c, i) => {
    c.text(LI_TWIN_SCHEMA.ports.text, BUILDING_TWIN[i].text);
});
const LI_TWIN = mLI_TWIN.done();

// --- MIKADO'S ROW, TWICE ---------------------------------------------------------------------
// Module scope, compiled exactly twice for the life of the process. Both render the identical
// `<li>row 0</li>` the reference emits; they differ only in whether the template declares a KEY,
// and the key attribute is consumed by the compiler and never rendered (`compile.js`
// `case "key": template.key = strip(v).replace("data.", "")` — it is not pushed into `tpl.attr`,
// so it cannot show up in a markup diff).

type TMikadoTemplate = ReturnType<typeof Mikado.compile>;

/**
 * The row the IMPERATIVE participant instantiates. NO KEY, on purpose.
 *
 * A key is not free: `create()` stamps `node[MIKADO_TPL_KEY]` and writes the node into the view's
 * `live` map, and `remove()` calls `checkout()` to take it back out again (mikado.js:1057, 1513,
 * 1653). All of that exists to make `render(array)` able to recognise a survivor — which this row
 * never asks it to do, because it never calls `render()` after the mount. Charging Mikado for
 * bookkeeping that only the OTHER row uses would be a handicap, so this template does not carry it.
 *
 * `pool` and `cache` are not set either, and here the reason is stronger than judgement: the
 * constructor computes `cacheable = this.recycle || !!this.key` and then
 * `this.pool = cacheable && options.pool ? 1 : 0`, `this.cache = cacheable && (...)`
 * (mikado.js:143-165). On an unkeyed, non-recycling view BOTH OPTIONS ARE FORCED OFF whatever the
 * caller passes. There is nothing to decide.
 */
const MK_ROW: TMikadoTemplate = Mikado.compile('<li>{{ data.text }}</li>');

/**
 * The row the DECLARATIVE participant instantiates. Keyed by `data.id` — the same row identity
 * every other diffing participant on this axis keys by (React `key={r.id}`, Svelte
 * `{#each rows as r (r.id)}`, Marko `by="id"`, Solid/voby `<For>` by item identity, and the schema
 * core by the `Row` object itself).
 *
 * WITHOUT the key, `render(newArray)` on a Mikado view does not diff at all — it takes the branch
 * `if(length && !key && !this.recycle){ this.remove(0, length) }` (mikado.js:757) and REBUILDS the
 * whole list from scratch. So keying is not a tuning choice here; it is the difference between
 * measuring a reconcile and measuring 300 rebuilds.
 */
const MK_ROW_KEYED: TMikadoTemplate = Mikado.compile('<li key="data.id">{{ data.text }}</li>');

export async function benchmarkListReconcile(rounds = 100, batch = DEFAULT_BATCH): Promise<void> {
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvList = (await import('../../svelte/SvList.svelte')).default;
    // Svelte 5 batches async — flushSync per op so the work lands in-region.
    const { mount: svMount, unmount: svUnmount, flushSync: flush } = await import('svelte');
    // Voby has no imperative list API — same as the other diffing frameworks it sets
    // a new array through <For> (keyed by Row identity → reuse/move); tick() flushes.
    const {
        $,
        $$,
        h: vh,
        render: vRender,
        For: vFor,
    } = (await import('voby')) as unknown as {
        $: (v: unknown) => { (): unknown; (v: unknown): void };
        $$: (v: unknown) => unknown;
        h: (...a: unknown[]) => unknown;
        render: (child: unknown, parent: Element) => () => void;
        For: unknown;
    };
    const { tick: obyTick } = (await import('oby')) as unknown as { tick: () => void };
    // Marko 6, authored as a `.marko` component (the only way Marko is written) and compiled
    // by the inline compiler in `vite.config.ts` — the same wiring `todo-app.tsx` uses for the
    // app axes. `update(input)` is the whole outside surface of a mounted Marko template, so
    // it is both the idiomatic and the only way to hand it a new array.
    const MkList = (await import('../../marko/MkList.marko')).default as unknown as {
        mount(
            input: { rows: readonly Row[] },
            el: HTMLElement
        ): { update(input: { rows: readonly Row[] }): void; destroy(): void };
    };
    // Marko batches on its own queue; `run()` drains it synchronously — see the note beside
    // the call site below for why it is here even though `update()` already drains.
    const { markoFlush } = await import('../../marko/flush');
    // Lit 3, through `lit-html`'s standalone `render()`. It has no counterpart to the flushes
    // above and needs none: `render()` commits inside the call, with no queue and no microtask
    // in the path. Why it is on the DECLARATIVE side — including what `lit-html/directive-
    // helpers.js` does and does not make reachable from application code — is in
    // `participants/lit/list.tsx`.
    const { mountLitList } = await import('../../participants/lit/list');
    // The three closest architectural relatives, all on the DECLARATIVE side and each for a
    // reason read out of its own source rather than assumed — the argument is in each file's
    // header. In one line apiece:
    //   stage0  — `stage0/reconcile(parent, renderedValues, data, createFn)` is its only list
    //             API and it is a diff; there is no move/insert/remove entry point in the
    //             library. It is also the CEILING for the ivi/Surplus LIS strategy, with no
    //             renderer around it — and the schema core does NOT run that strategy, so read
    //             `exodra` against it as two algorithms and not one plus overhead.
    //   uhtml   — an array in a hole is committed by `udomdiff`, which takes the whole node list;
    //             the differ is internal and nothing exported reaches a rendered row.
    //   sinuous — `sinuous/map` subscribes to the array and reconciles the whole of it; it
    //             returns a `DocumentFragment` and keeps its state in a closure, so there is no
    //             handle to tell a row moved.
    const { mountStage0List } = await import('../../participants/stage0/list');
    const { mountUhtmlList } = await import('../../participants/uhtml/list');
    const { mountSinuousList } = await import('../../participants/sinuous/list');

    // THE CLOCK AND THE CENSUS, FIRST AND OUT LOUD. Everything below is judged against these two
    // numbers, and the verdict is printed under the table at the end of the run. The phrasing of
    // the quantum is the one fourteen other axes use and the one `scripts/run-one-axis.js` scrapes
    // into the recording's `quantum` field — `list-update.latest.json` carries `"quantum": null`
    // because this axis printed no such line at all until now.
    const quantum = observeTimerQuantum();
    line(
        `list-update: observed timer quantum (${quantum.toFixed(3)} ms) — ${ROWS} rows, ` +
            `${OP_ROUNDS}×4 = ${OP_ROUNDS * 4} ops per scenario, batch ${batch}, ` +
            `${rounds} rounds. A batch of N runs N independent scenarios inside ONE timed region ` +
            `and divides, so the printed figure is per-scenario and the grid it was quantised at is ` +
            `${(quantum / batch).toFixed(4)} ms. The fastest row must clear ` +
            `${((MIN_TICKS * quantum) / batch).toFixed(4)} ms (${MIN_TICKS}× that grid) or this ` +
            'axis has measured the clock and not the frameworks'
    );

    let uid = 0;
    const seed = (): Row[] => Array.from({ length: ROWS }, (_, i) => ({ id: i, text: `row ${i}` }));
    // Apply the four mutations to a plain array (source of truth for the diffing
    // frameworks). Returns after each op via the supplied `commit`.
    const runOps = (data: Row[], commit: () => void): void => {
        for (let r = 0; r < OP_ROUNDS; r++) {
            data.splice(150, 0, data.splice(0, 1)[0]);
            commit(); // move
            data.splice(75, 0, { id: 1e6 + uid, text: `ins ${uid++}` });
            commit(); // insert
            data.splice(200, 1);
            commit(); // remove
            data.push({ id: 1e6 + uid, text: `add ${uid++}` });
            commit(); // append
        }
    };
    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };

    const solidPrep = (): Scenario => {
        const data = seed();
        const [rows, setRows] = createSignal(data.slice());
        const c = el();
        const dispose = render(
            () =>
                (
                    <ul>
                        <For each={rows()}>{(it: Row) => <li>{it.text}</li>}</For>
                    </ul>
                ) as never,
            c
        );
        return {
            measure: () => runOps(data, () => setRows([...data])),
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    const sveltePrep = (): Scenario => {
        const data = seed();
        const c = el();
        const inst = svMount(SvList, { target: c, props: { rows: data.slice() } });
        return {
            measure: () =>
                runOps(data, () => {
                    inst.setRows([...data]);
                    flush();
                }),
            cleanup: () => {
                svUnmount(inst);
                c.remove();
            },
        };
    };

    const reactPrep = (): Scenario => {
        const data = seed();
        const c = el();
        let setRows: (r: Row[]) => void = () => {};
        const List = (): unknown => {
            const [rows, set] = useState(data.slice());
            setRows = set;
            return rc(
                'ul',
                null,
                rows.map((r) => rc('li', { key: r.id }, r.text))
            );
        };
        const root = createRoot(c);
        flushSync(() => root.render(rc(List as never)));
        return {
            measure: () => runOps(data, () => flushSync(() => setRows([...data]))),
            cleanup: () => {
                root.unmount();
                c.remove();
            },
        };
    };

    const vobyPrep = (): Scenario => {
        const data = seed();
        const c = el();
        const rows = $(data.slice()) as { (): Row[]; (v: Row[]): void };
        const dispose = vRender(
            vh(
                'ul',
                {},
                vh(vFor, { values: rows }, (it: unknown) =>
                    vh('li', {}, () => ($$(it) as Row).text)
                )
            ),
            c
        );
        return {
            measure: () =>
                runOps(data, () => {
                    rows([...data]);
                    obyTick();
                }),
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- Schema core: declarative, same treatment as Solid/React ----------------
    // Returns the plain array and the container ALONGSIDE the scenario, so the gate
    // below can compare the DOM against the exact list the ops produced instead of
    // keeping a second, drifting copy of the op sequence.
    const makeExodraList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const rows = createExoBenchSource<readonly Row[]>(data.slice());
        // THE SHELL COMPONENT is built here rather than at module scope because its wiring
        // names THIS scenario's source, and a component is one value: the wire cannot be
        // supplied separately at the render call any more. That build is setup — the timed
        // region below is the ops — and the ROW component (`LI`), which is what a reconcile
        // actually clones, stays module-level with its schema compiled once.
        const UL_SCHEMA = createExoSchema((b) => {
            let rowsPort!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rowsPort = ul.childrenPort();
            });
            return { rows: rowsPort };
        });
        const mUL = createExoMachineBuilder<TExoDomNode>(UL_SCHEMA);
        const K_UL = mUL.createInitialState((c) => ({
            kids: c.childList(UL_SCHEMA.ports.rows),
            shown: [] as Row[],
        }));
        const showRows = mUL.transition((c: TExoDomNode) => {
            const state = c.readState(K_UL);
            const want = rows.getValue();
            state.shown = reconcileExoOrder(state.kids, state.shown, want, want, (item, i) => {
                BUILDING[i] = item;
                return c.build(LI, i);
            });
        });
        mUL.effect((c) => {
            showRows(c);
            return rows.onChange(() => showRows(c));
        });
        const UL = mUL.done();
        // ONE instance of UL; the rows are a reactive list in its children port,
        // reconciled by object IDENTITY — the Row objects are the same ones `runOps`
        // shuffles, so kept rows are recognised without a key.
        const dispose = EXO_BACKEND.render(UL, c);
        return {
            data,
            c,
            scenario: {
                measure: () => runOps(data, () => rows.setValue(data.slice())),
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            },
        };
    };
    const exodraPrep = (): Scenario => makeExodraList().scenario;

    // THE TOLD ROW. Each op goes straight to the shell's `c.childList` — `move(0, 150)`,
    // `insert(build, 75)`, `remove(200)`, `insert(build)` — through transitions the scenario fires
    // from outside, the same four index calls `mikado`'s row makes on its view. Nothing is diffed.
    const makeExodraToldList = (
        row: typeof LI,
        building: Row[],
        backend: typeof EXO_BACKEND
    ): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const UL_TOLD_SCHEMA = createExoSchema((b) => {
            let rowsPort!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rowsPort = ul.childrenPort();
            });
            return { rows: rowsPort };
        });
        const mUL_TOLD = createExoMachineBuilder<TExoDomNode>(UL_TOLD_SCHEMA);
        const K_UL_TOLD = mUL_TOLD.createInitialState((c2) => ({
            kids: c2.childList(UL_TOLD_SCHEMA.ports.rows),
        }));
        let node!: TExoDomNode;
        mUL_TOLD.effect((c2) => {
            node = c2;
            const kids = c2.readState(K_UL_TOLD).kids;
            for (let i = 0; i < data.length; i++) {
                building[i] = data[i];
                kids.insert(c2.build(row, i), i);
            }
            return null;
        });
        const insertRow = mUL_TOLD.transition((c2: TExoDomNode, item: Row, at: number) => {
            const kids = c2.readState(K_UL_TOLD).kids;
            building[at] = item;
            kids.insert(c2.build(row, at), at);
        });
        const moveRow = mUL_TOLD.transition((c2: TExoDomNode, from: number, to: number) => {
            c2.readState(K_UL_TOLD).kids.move(from, to);
        });
        const removeRow = mUL_TOLD.transition((c2: TExoDomNode, at: number) => {
            c2.readState(K_UL_TOLD).kids.remove(at);
        });
        const UL_TOLD = mUL_TOLD.done();
        const dispose = backend.render(UL_TOLD, c);
        return {
            data,
            c,
            scenario: {
                measure: () => {
                    for (let r = 0; r < OP_ROUNDS; r++) {
                        data.splice(150, 0, data.splice(0, 1)[0]);
                        moveRow(node, 0, 150);
                        const ins = { id: 1e6 + uid, text: `ins ${uid++}` };
                        data.splice(75, 0, ins);
                        insertRow(node, ins, 75);
                        data.splice(200, 1);
                        removeRow(node, 200);
                        const add = { id: 1e6 + uid, text: `add ${uid++}` };
                        data.push(add);
                        insertRow(node, add, data.length - 1);
                    }
                },
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            },
        };
    };
    const makeExodraTold = (): { scenario: Scenario; data: Row[]; c: HTMLElement } =>
        makeExodraToldList(LI, BUILDING, EXO_BACKEND);
    const makeExodraToldTwin = (): { scenario: Scenario; data: Row[]; c: HTMLElement } =>
        makeExodraToldList(LI_TWIN, BUILDING_TWIN, EXO_BACKEND_TWIN);
    const exodraToldPrep = (): Scenario => makeExodraTold().scenario;
    const exodraToldTwinPrep = (): Scenario => makeExodraToldTwin().scenario;

    // --- THE NULL CONTROL: the same program, declared a second time -----------------------------
    //
    // It is not a participant and answers no question about a framework. It is a SECOND,
    // SEPARATELY DECLARED copy of the row above it — `LI_TWIN` instead of `LI`, its own `<ul>`
    // shell built from its own source, `EXO_BACKEND_TWIN` instead of `EXO_BACKEND` — fired by the
    // identical ops through the identical reactive primitive. Its true difference from the row it
    // twins is ZERO BY CONSTRUCTION, so what the table shows between them is this instrument
    // reading its own zero, and `reportResolution` turns that into the floor every gap on this axis
    // is read against.
    //
    // WHAT IS NOT DUPLICATED, and this is the line that keeps a twin a null rather than a second
    // experiment: the DATA and the OP SEQUENCE. The twin seeds its own `Row` objects (identity is
    // what the reconcile keys on, so sharing them would make the two rows one list) and then runs
    // the same `runOps` loop, in the same order, over its own copy.
    const makeExodraTwinList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const rows = createExoBenchSource<readonly Row[]>(data.slice());
        const UL_TWIN_SCHEMA = createExoSchema((b) => {
            let rowsPort!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rowsPort = ul.childrenPort();
            });
            return { rows: rowsPort };
        });
        const mUL_TWIN = createExoMachineBuilder<TExoDomNode>(UL_TWIN_SCHEMA);
        const K_UL_TWIN = mUL_TWIN.createInitialState((c2) => ({
            kids: c2.childList(UL_TWIN_SCHEMA.ports.rows),
            shown: [] as Row[],
        }));
        const showTwinRows = mUL_TWIN.transition((c2: TExoDomNode) => {
            const state = c2.readState(K_UL_TWIN);
            const want = rows.getValue();
            state.shown = reconcileExoOrder(state.kids, state.shown, want, want, (item, i) => {
                BUILDING_TWIN[i] = item;
                return c2.build(LI_TWIN, i);
            });
        });
        mUL_TWIN.effect((c2) => {
            showTwinRows(c2);
            return rows.onChange(() => showTwinRows(c2));
        });
        const UL_TWIN = mUL_TWIN.done();
        const dispose = EXO_BACKEND_TWIN.render(UL_TWIN, c);
        return {
            data,
            c,
            scenario: {
                measure: () => runOps(data, () => rows.setValue(data.slice())),
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            },
        };
    };
    const exodraTwinPrep = (): Scenario => makeExodraTwinList().scenario;

    // --- Marko: declarative, same treatment as Solid/React/Svelte/voby ------------
    // Shaped like `makeExodraList` so it can go through the SAME gate below rather than a
    // second, softer one written for it: it hands back the plain array the ops mutated and the
    // container, and the gate reads the expected order straight off the array.
    //
    // WHY THE FLUSH IS HERE. `update()` already commits synchronously — `mount()`'s `update`
    // in marko/dist/dom.mjs wraps the input signal in `prepareEffects`, which sets the
    // rendering flag, runs the signal and then drains `runRenders()` before returning — so
    // nothing should be left queued. `markoFlush()` (`run()` from `marko/dom`) is here anyway
    // because that reading is from the runtime's source and not from a measurement, and a
    // batching framework whose work escaped the timed region would simply come out fast rather
    // than fail. On an empty queue `run()` is a couple of statements against a 300-row
    // reconcile, so the insurance costs Marko nothing readable — and it is the same treatment
    // react/svelte/voby get on every axis in this suite.
    const makeMarkoList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const inst = MkList.mount({ rows: data.slice() }, c);
        return {
            data,
            c,
            scenario: {
                measure: () =>
                    runOps(data, () => {
                        inst.update({ rows: data.slice() });
                        markoFlush();
                    }),
                cleanup: () => {
                    inst.destroy();
                    c.remove();
                },
            },
        };
    };
    const markoPrep = (): Scenario => makeMarkoList().scenario;

    // --- Lit: declarative, same treatment as Solid/React/Svelte/voby/marko ---------
    // Shaped like `makeMarkoList` so it goes through the SAME gate below rather than a second,
    // softer one written for it: it hands back the plain array the ops mutated and the container,
    // and the gate reads the expected order straight off the array.
    //
    // WHY THE DECLARATIVE SIDE. Lit has no imperative list API that application code can reach —
    // its list directives (`repeat`, `map`, `join`, `range`) all take the whole iterable, and the
    // one thing that looks like a mutation API, `lit-html/directive-helpers.js`'s `insertPart` /
    // `removePart` / `setChildPartValue`, takes a `ChildPart`, which is only handed out inside a
    // `Directive`'s `update()`. There is no route from a rendered `<li>` back to the part that
    // owns it. Reaching them would mean writing a directive that owns its own parts, which is
    // re-implementing `repeat()` — the hand-optimised participant this suite already has a
    // cautionary tale about. The argument in full, with the doc comments it is read from, is in
    // `participants/lit/list.tsx`.
    //
    // NO FLUSH: `render()` writes to the DOM inside the call (`part._$setValue(value)` is the
    // last thing it does, with no queue and no microtask in the path), so each of the 80 ops has
    // committed by the time the commit callback returns.
    const makeLitList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const inst = mountLitList({ rows: data.slice() }, c);
        return {
            data,
            c,
            scenario: {
                measure: () => runOps(data, () => inst.update({ rows: data.slice() })),
                cleanup: () => {
                    inst.destroy();
                    c.remove();
                },
            },
        };
    };
    const litPrep = (): Scenario => makeLitList().scenario;

    // --- stage0, uhtml, sinuous: declarative, same treatment as everyone above ------
    // All three are shaped like `makeLitList` so they go through the SAME gate rather than three
    // softer ones written for them: each hands back the plain array the ops mutated and its
    // container, and the gate reads the expected order straight off the array. Each is handed
    // `data.slice()` per op, exactly as lit and marko are — the fresh array is what makes it a
    // reconcile rather than a comparison of an array with itself.
    //
    // `stage0` IS THE CEILING ROW, not a competitor: `reconcile()` is the ivi/Surplus LIS
    // algorithm with no renderer around it and no state of its own (the caller holds the previously
    // rendered array, because that is the library's contract). `reconcileExoOrder` runs the same
    // LIS family over row identity, so `exodra` read against this row is stage0 plus what the
    // renderer costs.
    const makeStage0List = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const inst = mountStage0List({ rows: data.slice() }, c);
        return {
            data,
            c,
            scenario: {
                measure: () => runOps(data, () => inst.update({ rows: data.slice() })),
                cleanup: () => {
                    inst.destroy();
                    c.remove();
                },
            },
        };
    };
    const stage0Prep = (): Scenario => makeStage0List().scenario;

    // uhtml: the array is committed by `udomdiff` and the rows carry uhtml's own `key`
    // attribute, so a survivor is found through the template's `Keyed` map rather than by
    // position. Without the key the i-th new row would render into the i-th old row's DOM — the
    // failure the keying check further down exists to catch, exactly as it does for Lit.
    const makeUhtmlList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const inst = mountUhtmlList({ rows: data.slice() }, c);
        return {
            data,
            c,
            scenario: {
                measure: () => runOps(data, () => inst.update({ rows: data.slice() })),
                cleanup: () => {
                    inst.destroy();
                    c.remove();
                },
            },
        };
    };
    const uhtmlPrep = (): Scenario => makeUhtmlList().scenario;

    // sinuous: `map()` reconciles by ITEM IDENTITY, which is the same identity the schema core
    // uses. ONE COST THAT IS NOT SHARED and that makes this row slower rather than faster:
    // `map.js` looks a survivor up with `tmp = I.get(a[i]); if (tmp)`, so the row whose NEW index
    // is `0` reads as not-found and is destroyed and rebuilt. The `move` op puts a fresh item at
    // index 0 and takes the general path, so one of the 300 rows is rebuilt per round — 20 per
    // measured region. It is left exactly as the library does it; see
    // `participants/sinuous/list.tsx`.
    const makeSinuousList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const inst = mountSinuousList({ rows: data.slice() }, c);
        return {
            data,
            c,
            scenario: {
                measure: () => runOps(data, () => inst.update({ rows: data.slice() })),
                cleanup: () => {
                    inst.destroy();
                    c.remove();
                },
            },
        };
    };
    const sinuousPrep = (): Scenario => makeSinuousList().scenario;

    // --- Mikado, IMPERATIVE: the same four ops, said to the view -------------------
    // Shaped like every other mounter here so it goes through the SAME gate: the plain array is kept
    // in step purely so the gate can read the expected order off it, and nothing in the measured
    // region ever re-reads it. The participant it is comparable to is `exodraTold`.
    //
    // A MIKADO VIEW OWNS THE CHILDREN OF THE ROOT IT IS MOUNTED ON (`mount()` empties that root),
    // so the `<ul>` is created here rather than by a template — the same arrangement
    // `apps/mikado/mikado.tsx` uses for the app div, and the reason the container `c` holds a
    // `<ul>` the
    // reference also holds.
    //
    // WHY `shift(0, 150)` AND NOT `move(0, 150)`, since `move` is the one whose name matches the
    // operation. They are the same helper: `move(node, position)` normalises its argument to a
    // NODE and then calls `this.shift(node, position - index)` (helper.js:17-40) — and because it
    // hands `shift` a node rather than the index it was given, `shift` recovers the index with
    // `this.index(a)`, which is `dom.indexOf(node)` over 300 elements (mikado.js:1626). That scan
    // is 300 comparisons per move, 6000 per measured region, and it exists only because Mikado's
    // own helper throws away a number it already had. Charging Mikado for re-deriving an index it
    // was handed would be paying for a round trip nobody else makes, which is why this row takes
    // the relative form. `shift(index, offset)` — `shiftBy` in the docs, the
    // relative-offset half of the same documented pair — takes the number and skips the scan, and
    // `shift(i, j - i)` expresses ANY move, not just this one. Everything after the index lookup
    // is byte-for-byte the same code.
    //
    // NOTHING TO FLUSH. `add`, `remove` and `shift` write to the DOM inside the call; the only
    // asynchrony Mikado has is `render()`'s `{ async: true }` option or its callback form
    // (mikado.js:680-710), and neither is used anywhere in this file.
    const makeMikadoList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const ul = document.createElement('ul');
        c.appendChild(ul);
        // A view owns its factory, so a view is per scenario. `mount` is passed in the OPTIONS
        // rather than called afterwards on purpose: the constructor consumes the template's
        // compiled render function with `fn.pop()` and only `mount()` puts it back
        // (`finishFactory`, mikado.js:511), so a second view built from the same template before
        // the first one has mounted would come out with no render function at all. Every Mikado
        // view in this suite is constructed with `{ mount }` for that reason.
        const view = new Mikado(MK_ROW, { mount: ul });
        view.render(data.slice());
        return {
            data,
            c,
            scenario: {
                measure: () => {
                    for (let r = 0; r < OP_ROUNDS; r++) {
                        data.splice(150, 0, data.splice(0, 1)[0]);
                        view.shift(0, 150); // move: one insertBefore + 150 array writes
                        const ins = { id: 1e6 + uid, text: `ins ${uid++}` };
                        data.splice(75, 0, ins);
                        view.add(ins, 75); // insert: clone the factory, insertBefore, splice
                        data.splice(200, 1);
                        view.remove(200); // remove: dom.splice + node.remove()
                        const add = { id: 1e6 + uid, text: `add ${uid++}` };
                        data.push(add);
                        view.add(add); // append: clone the factory, appendChild
                    }
                },
                cleanup: () => {
                    view.destroy();
                    c.remove();
                },
            },
        };
    };
    const mikadoPrep = (): Scenario => makeMikadoList().scenario;

    // --- Mikado, DECLARATIVE: the same list handed the new array ------------------
    // The other half of the pair, and the entry that is comparable to solid/svelte/react/voby/
    // marko/exodra: `render(newArray)` on a KEYED view, which walks the common prefix and drops
    // into `reconcile()` — Mikado's "longest distance" keyed diff (mikado.js:1243) — at the first
    // key that does not match.
    //
    // `{ cache: true }`, AND THE ARGUMENT FOR IT IS FAIRNESS RATHER THAN SPEED. A row's text never
    // changes on this axis; only its position does. But Mikado's reconciler calls `update()` on
    // every row whose key matched (mikado.js:775 and 1290), and `update()` re-runs the compiled
    // render function, whose text line is `if(!_o.c||_o.c._t!==_v){ _o.n.nodeValue=_v }`
    // (compile.js:656). With no cache, `_o.c` is null and that writes all 300 unchanged strings
    // back into the DOM on every one of the 80 ops. Not one other participant here does that:
    // Solid's `<For>` and Marko's `<for by>` move nodes and leave their text alone, and the schema
    // core's row wiring is `set`, not `bind`. The cache is what buys Mikado the same behaviour, and
    // it is also the first line of Mikado's own Best Practices ("For keyed recycling use
    // { pool: true } by adding cache=true ... in addition to a key"). NOTE the cache has to be
    // passed as an OPTION: the runtime compiler swallows a `cache="true"` template attribute
    // without acting on it (`compile.js` `case "cache": break;`), so writing it in the template
    // string would silently do nothing.
    //
    // `pool` IS DELIBERATELY OFF, against the same Best Practices line, and this is the one place
    // in this file where the recommended setting is not the honest one. A keyed pool holds a
    // removed node under its key so that an item with the SAME key coming back later gets its node
    // back (`checkout` → `pool_keyed.set(key, node)`, `create` → `pool_keyed.get(key)`). These ops
    // never bring a key back: every insert mints a fresh `1e6 + uid`, and every remove drops a row
    // for good. So the pool cannot hit — it can only fill, get trimmed, and change the reconciler's
    // not-found branch from `add()` to `replace()`, which the source itself annotates as the worse
    // of the two here ("without pool enabled .add() is better than .replace()", mikado.js:1297).
    // Mikado's own docs say not to take these blindly; this is what not-blindly looks like.
    //
    // AND ONE COST THAT LANDS INSIDE THE TIMED REGION AND IS NOT SHARED, stated because nothing in
    // the output would reveal it. Mikado addresses a row's dynamic positions through a per-instance
    // array of `Cache` objects, built LAZILY: `create()` runs the render function against the
    // FACTORY and then clones it, so a clone carries no path of its own, and `update()` builds one
    // the first time it touches that node (`node[MIKADO_TPL_PATH] || create_path(...)`,
    // mikado.js:1014). Each build walks the clone. So this row resolves 300 rows on the FIRST of
    // its 80 ops, inside the measured region, where Solid and the schema core resolved theirs at
    // mount — and `abBench` builds a fresh scenario per sample, so every sample pays it once. It is
    // NOT warmed here: calling `view.update(...)` 300 times in setup would move that work out of
    // the timed region, which is exactly the kind of step a benchmark author adds for the framework
    // they want to win. Note the IMPERATIVE row above never pays it at all — it never calls
    // `update()`, so its clones never grow a path. That difference is Mikado's, not the harness's.
    const makeMikadoKeyedList = (): { scenario: Scenario; data: Row[]; c: HTMLElement } => {
        const data = seed();
        const c = el();
        const ul = document.createElement('ul');
        c.appendChild(ul);
        const view = new Mikado(MK_ROW_KEYED, { mount: ul, cache: true });
        view.render(data.slice());
        return {
            data,
            c,
            scenario: {
                measure: () => runOps(data, () => view.render(data.slice())),
                cleanup: () => {
                    view.destroy();
                    c.remove();
                },
            },
        };
    };
    const mikadoKeyedPrep = (): Scenario => makeMikadoKeyedList().scenario;

    // GATE — the new participants, and only them. The other four have been on this axis
    // since it was written; the schema core has not, and a reconcile that produced the
    // wrong ORDER or quietly rebuilt the list would not fail, it would just come out
    // fast. So run the ops once and require two things of the result: the DOM reads
    // back EXACTLY the array the ops produced, and the original row elements are still
    // there (a rebuild keeps none of them).
    // Both schema participants go through it, because the op path can be wrong in a way the
    // diff path cannot: an op is APPLIED, never checked, so a misplaced `move` produces a
    // list that is fast and in the wrong order.
    //
    // `marko` goes through the SAME gate, unchanged and unwidened. It is the newest arrival
    // here and the one whose keying could be silently wrong: `<for of=…>` defaults to keying
    // by INDEX, and an index-keyed list survives a move by rewriting every row's text instead
    // of moving a node — which reads as a fast reconcile and is not one. The survivor half of
    // this gate is exactly what catches that.
    const gateList = (
        label: string,
        make: () => { scenario: Scenario; data: Row[]; c: HTMLElement }
    ): void => {
        const { scenario, data, c } = make();
        const before = new Set<Element>(Array.from(c.querySelectorAll('li')));
        if (before.size !== ROWS) {
            throw new Error(`list-update/${label}: mounted ${before.size} rows, expected ${ROWS}`);
        }
        scenario.measure();
        const after = Array.from(c.querySelectorAll('li'));
        const want = data.map((r) => r.text);
        const got = after.map((li) => li.textContent);
        const wrongAt = want.findIndex((t, i) => t !== got[i]);
        const survivors = after.filter((li) => before.has(li)).length;
        scenario.cleanup();
        if (got.length !== want.length || wrongAt !== -1) {
            throw new Error(
                `list-update/${label}: after ${OP_ROUNDS}×4 ops the list reads ${got.length} rows ` +
                    `(want ${want.length})` +
                    (wrongAt === -1
                        ? ''
                        : `, first wrong at ${wrongAt}: "${got[wrongAt]}" want "${want[wrongAt]}"`) +
                    ' — that timing would be measuring a different, wrong reconcile'
            );
        }
        // The ops splice 20 originals out; the other 280 have no reason to leave. The
        // bound is deliberately loose — it is here to catch a REBUILD, not to assert an
        // exact arithmetic of the op sequence that would break the axis if it drifted.
        if (survivors < 200) {
            throw new Error(
                `list-update/${label}: only ${survivors} of ${ROWS} original rows survived the ops ` +
                    "— that is a rebuild wearing a reconcile's timing, not a reconcile"
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate ${label}: ${got.length} rows in the exact order the ops produced, ` +
                `${survivors}/${ROWS} original nodes REUSED`
        );
    };
    gateList('exodra', makeExodraList);
    // THE CONTROL GOES THROUGH THE SAME GATE, UNWIDENED, and it has to: a twin that quietly
    // rebuilt its list, or applied its ops in the wrong order, would still produce a number — and
    // that number would become the RESOLUTION FLOOR every gap on this axis is judged against. A
    // broken control does not read as broken; it reads as a coarse instrument, and it would silence
    // real differences by declaring them unresolvable.
    gateList('exodra·twin', makeExodraTwinList);
    gateList('exodraTold', makeExodraTold);
    gateList('exodraTold·twin', makeExodraToldTwin);
    gateList('marko', makeMarkoList);
    // BOTH Mikado rows go through it, unchanged and unwidened, and each can fail it in its own
    // way. The imperative row applies ops it never checks — `shift(0, 150)` off by one produces a
    // list that is fast and in the wrong order, and nothing in a timing would show it.
    // The keyed row can be silently unkeyed: if the key ever failed to resolve, every
    // `node[MIKADO_TPL_KEY]` and every `item[key]` would be `undefined`, they would compare equal,
    // `reconcile()` would never run, and 300 texts would be rewritten in place instead. That
    // produces the right final order and keeps every node, so only the identity check below can
    // see it.
    gateList('mikado', makeMikadoList);
    gateList('mikadoKeyed', makeMikadoKeyedList);
    // Lit goes through it too, unwidened, and it can fail in the same way the keyed Mikado row
    // can: `repeat()` without its key function — and Lit's other list forms, a plain `.map()` or
    // the `map` directive — render POSITIONALLY, surviving these ops by leaving every node where
    // it is and rewriting its text. That produces the right final order and keeps every node, so
    // both halves of this gate pass; only the identity check further down can see it.
    gateList('lit', makeLitList);
    // And the three newcomers, through the same gate and unwidened. Two of them can fail it the
    // way the keyed Mikado row can — uhtml without its `key` attribute renders the i-th new row
    // into the i-th old row's DOM — and all three can fail its ORDER half, which is the one thing
    // no amount of reading the library can promise. `sinuous` is the one whose SURVIVOR half is
    // interesting rather than routine: its `map` rebuilds the row that lands at index 0 (see
    // `participants/sinuous/list.tsx`), so it loses one node per `move` op — 20 of 300 across the
    // region, well inside the "this is a reconcile, not a rebuild" bound of 200 this gate
    // enforces, and it
    // costs sinuous time rather than saving it.
    gateList('stage0', makeStage0List);
    gateList('uhtml', makeUhtmlList);
    gateList('sinuous', makeSinuousList);

    // AND THE ONE THING THE GATE ABOVE CANNOT SEE ABOUT A CONTROL: WHETHER IT IS THE SAME PROGRAM.
    //
    // `gateList` proves the twin reconciles correctly. It does NOT prove the twin renders what the
    // row it twins renders — and a twin whose markup differs is not a null, it is an unannounced
    // second experiment whose difference from the reference is a real one being published as the
    // instrument's noise floor. So it is mounted beside its reference and diffed, at MOUNT and
    // again AFTER the ops, because two lists can agree at mount and disagree once they have moved.
    // This is `app-update`'s `verifyExodraTwinApp` check, at this axis's shape.
    //
    // ONE THING IS NORMALISED BEFORE THE DIFF, AND ONLY ONE. Every inserted row is minted
    // `ins ${uid++}` / `add ${uid++}` from a counter shared by the whole file and never reset, so
    // the reference and the twin — which run one after the other — insert `ins 12` against
    // `ins 92`. That is the counter's position in the run and nothing about either program, so the
    // digits are dropped from BOTH sides and everything else is compared byte for byte: every
    // seeded row's text, every element, every position, both states. Dropping anything more would
    // be widening a gate to make it pass.
    const normalise = (html: string): string => html.replace(/>(ins|add) \d+</g, '>$1<');
    for (const [label, mkRef, mkTwin] of [
        ['exodra', makeExodraList, makeExodraTwinList],
        ['exodraTold', makeExodraTold, makeExodraToldTwin],
    ] as const) {
        const ref = mkRef();
        const twin = mkTwin();
        const snapshot = (): readonly [string, string] => [
            normalise(ref.c.innerHTML),
            normalise(twin.c.innerHTML),
        ];
        const [m0, t0] = snapshot();
        ref.scenario.measure();
        twin.scenario.measure();
        const [m1, t1] = snapshot();
        ref.scenario.cleanup();
        twin.scenario.cleanup();
        for (const [stage, a, b] of [
            ['mount', m0, t0],
            ['after the ops', m1, t1],
        ] as const) {
            if (a !== b) {
                // -1 when one string is a PREFIX of the other — the difference is then the tail,
                // and pointing at the shorter one's end is what shows it.
                const at = Array.from(a).findIndex((ch, k) => ch !== b[k]);
                const i = at === -1 ? Math.min(a.length, b.length) : at;
                const from = Math.max(0, i - 60);
                throw new Error(
                    `list-update/${label}·twin !== ${label} @ ${stage} — ${a.length} chars ` +
                        `(reference) / ${b.length} chars (twin), first differing at ${i}:\n` +
                        `  reference: …${a.slice(from, i + 160)}…\n` +
                        `  twin     : …${b.slice(from, i + 160)}…\n` +
                        'A control that renders something else is not a null — the difference it ' +
                        'shows would be published as the resolution floor of this axis'
                );
            }
        }
        line(
            `gate ${label}·twin === ${label}: identical markup at mount and after ` +
                `${OP_ROUNDS * 4} ops (${m1.length} chars), from a second schema on a second ` +
                'backend — so the row-to-row difference is the instrument and nothing else'
        );
    }

    // AND ONE MORE THING OF MARKO, which the gate above cannot see. `<for of=…>` keys by INDEX
    // unless told otherwise, and an index-keyed list survives these ops by leaving every node
    // where it is and rewriting its text. That produces the right final order (so the order
    // half of the gate passes) and keeps nearly every node (so the survivor half passes), while
    // being a materially cheaper program than the keyed reconcile everyone else on this axis
    // runs. The only thing that tells the two apart is WHICH node carries a given row after the
    // ops: `by="id"` moves the node that read `row 0` and leaves its text alone; the index
    // default leaves the node and changes its text.
    {
        const { scenario, c } = makeMarkoList();
        const row0 = c.querySelector('li') as Element;
        scenario.measure();
        const text = row0.textContent;
        const at = Array.from<Element>(c.querySelectorAll('li')).indexOf(row0);
        scenario.cleanup();
        if (text !== 'row 0') {
            throw new Error(
                `list-update/marko: the node that read "row 0" at mount now reads "${text}" — it ` +
                    'stayed put and had its text rewritten, which means the list is keyed by INDEX ' +
                    '(the `<for of=…>` default) rather than by row id, and moves nothing'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate marko keying: the node that read "row 0" at mount still reads "${text}" and is ` +
                `now at DOM position ${at} — the NODE moved, so the list really is id-keyed`
        );
    }

    // AND THE SAME QUESTION ASKED OF BOTH MIKADO ROWS, for the same reason and with the same
    // check: after the ops, is the node that read `row 0` at mount still the node that reads it?
    //
    // For `mikadoKeyed` the failure it catches is the one described at the gate above — a key that
    // did not resolve turns the reconcile into 300 text rewrites, which passes order and survivor
    // counts while being a much cheaper program. For `mikado` the check is not about keying at all
    // (that row has no key); it is about whether `shift()` really MOVED a node. Mikado's helper
    // does one `insertBefore` and then repairs its own `dom` array by hand (helper.js:51-120), and
    // an implementation that instead re-rendered the affected range would produce the same HTML
    // from a completely different amount of work. Both are pinned rather than trusted.
    for (const [label, make] of [
        ['mikado', makeMikadoList],
        ['mikadoKeyed', makeMikadoKeyedList],
    ] as const) {
        const { scenario, c } = make();
        const row0 = c.querySelector('li') as Element;
        scenario.measure();
        const text = row0.textContent;
        const at = Array.from<Element>(c.querySelectorAll('li')).indexOf(row0);
        scenario.cleanup();
        if (text !== 'row 0') {
            throw new Error(
                `list-update/${label}: the node that read "row 0" at mount now reads "${text}" — it ` +
                    'stayed where it was and had its text rewritten instead of being moved, which is ' +
                    'a different and much cheaper program than the one this axis is timing'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate ${label} identity: the node that read "row 0" at mount still reads "${text}" ` +
                `and is now at DOM position ${at} — the NODE moved`
        );
    }

    // AND THE SAME QUESTION ASKED OF LIT, which the gate above cannot see either. `repeat()`'s
    // second argument is the key function, and WITHOUT it — or with Lit's other list forms, a
    // plain `.map()` or the `map` directive, which commit through `ChildPart._commitIterable` and
    // reuse one nested part per INDEX — the list survives these ops by leaving every node where
    // it is and rewriting its text. Right final order, every node kept, both halves of the gate
    // green, and a materially cheaper program than the keyed reconcile everyone else here runs.
    // The only thing that tells them apart is WHICH node carries `row 0` afterwards: keyed by
    // `r.id`, the node that read it is MOVED and its text is never touched.
    {
        const { scenario, c } = makeLitList();
        const row0 = c.querySelector('li') as Element;
        scenario.measure();
        const text = row0.textContent;
        const at = Array.from<Element>(c.querySelectorAll('li')).indexOf(row0);
        scenario.cleanup();
        if (text !== 'row 0') {
            throw new Error(
                `list-update/lit: the node that read "row 0" at mount now reads "${text}" — it ` +
                    'stayed put and had its text rewritten, which means the list is being rendered ' +
                    'POSITIONALLY (a plain `.map()`, the `map` directive, or `repeat()` without its ' +
                    'key function) rather than keyed by row id, and moves nothing'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate lit keying: the node that read "row 0" at mount still reads "${text}" and is ` +
                `now at DOM position ${at} — the NODE moved, so \`repeat()\` really is id-keyed`
        );
    }

    // AND THE SAME QUESTION ASKED OF THE THREE NEWCOMERS, for the same reason: the gate above
    // cannot tell a reorder from a positional rewrite, because both produce the right final order
    // and keep every node. What each one would be failing here is different, which is why the
    // check is worth running on all three rather than assumed from the code:
    //
    //   stage0  — `reconcile` compares the ITEMS, so a node is only reused for the row it already
    //             holds. If this ever failed, the participant would be rendering by position.
    //   uhtml   — WITHOUT the `key` attribute, `holed()` pairs the i-th new hole with the i-th
    //             live one and never redirects, so every row's text would be rewritten in place
    //             and nothing would move. The key is the whole difference and it is asserted
    //             here rather than trusted.
    //   sinuous — `map` reconciles by item identity like stage0; its one quirk (the row landing
    //             at index 0 is rebuilt) cannot reach row 0's node, which is at position ~150
    //             from the first `move` onwards and never returns to the head.
    for (const [label, make] of [
        ['stage0', makeStage0List],
        ['uhtml', makeUhtmlList],
        ['sinuous', makeSinuousList],
    ] as const) {
        const { scenario, c } = make();
        const row0 = c.querySelector('li') as Element;
        scenario.measure();
        const text = row0.textContent;
        const at = Array.from<Element>(c.querySelectorAll('li')).indexOf(row0);
        scenario.cleanup();
        if (text !== 'row 0') {
            throw new Error(
                `list-update/${label}: the node that read "row 0" at mount now reads "${text}" — it ` +
                    'stayed put and had its text rewritten instead of being moved, which means the ' +
                    'list is being rendered POSITIONALLY rather than by row identity — a much ' +
                    'cheaper program than the one every other participant on this axis runs'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate ${label} identity: the node that read "row 0" at mount still reads "${text}" ` +
                `and is now at DOM position ${at} — the NODE moved`
        );
    }

    const table = await abBench(
        `LIST UPDATE — ${OP_ROUNDS}×{move,insert,remove,append} (told-what-changed vs keyed-diff)`,
        `ms/${OP_ROUNDS * 4} ops`,
        {
            exodra: exodraPrep,
            // THE CONTROL, listed next to the row it twins so a reader meets them as a pair. It is
            // not a participant: its true difference from the row above is zero by construction, and
            // what the table shows between them is the resolution `reportResolution` prints below
            // it. See THE NULL CONTROL above.
            'exodra·twin': exodraTwinPrep,
            // IMPERATIVE side: `exodraTold` and `mikado` make the same four index calls and are read
            // against each other only; a derive row is a different program.
            exodraTold: exodraToldPrep,
            'exodraTold·twin': exodraToldTwinPrep,
            mikado: mikadoPrep,
            solid: solidPrep,
            svelte: sveltePrep,
            react: reactPrep,
            voby: vobyPrep,
            marko: markoPrep,
            mikadoKeyed: mikadoKeyedPrep,
            lit: litPrep,
            // DECLARATIVE side. `stage0` is the CEILING of that side — the same algorithm family
            // with no renderer around it — so read the rows above it as "stage0 plus what that
            // library does for you", and never as a framework recommendation.
            stage0: stage0Prep,
            uhtml: uhtmlPrep,
            sinuous: sinuousPrep,
        } as never,
        { rounds, batch }
    );

    // IS THE TABLE A MEASUREMENT OR THE CLAMP — first, because everything after it is read through
    // the answer. Then what the run resolved, from the one control it has left.
    reportScale(table, quantum, batch);
    reportResolution(table, quantum, batch);
}
