import { writeFileSync } from 'node:fs';
// SERVER RENDER, head to head: the schema+wiring core against the renderers this repo
// actually builds — the SHIPPED string backend, Solid and Marko 6 — in ONE process, so
// nothing differs between them but the code being timed.
//
// IT IMPORTS THE PUBLISHED PACKAGES, `@exodra/core` and `@exodra/string`, and that is a
// correction rather than a preference: this file used to reach into a prototype's source tree,
// which stopped existing when the core was folded into the real packages — so the measurement
// could not run at all, and before that it was timing code nobody ships. Measuring `dist` is the
// same treatment every browser axis gets, and it means a rebuild at the repo root has to come
// first or this times older code than the tests cover.
//
//   npx tsx ssr/exodra-measure.mts            (from packages/benchmarks)
//
// WHAT IS GATED, and what is not. There is no second Exodra renderer left to diff against —
// the three-props renderer and the cursor prototype have both been deleted — so what runs
// before the timing is a BYTE COUNT per participant, printed beside every result. A renderer
// that emits less is faster for a reason no timing harness detects, and the byte column is
// what makes that visible here.
//
// Solid and Marko emit MORE than either of ours — they write hydration keys into every node
// — so their byte counts are printed too. That is not a footnote: it is work they do and we
// do not, and a millisecond comparison that hides it is dishonest.
import { pathToFileURL } from 'url';
import {
    createExoComponent,
    type TExoAttrPort,
    type TExoEventPort,
    type TExoTextPort,
} from '@exodra/core';
// `renderExoRows`, not `renderRows`. The old name was renamed in `@exodra/string` and this
// file kept the old one, so it threw at import for as long as that rename has been in — while
// its figures stood on the docs site marked with a date, as if they were current. Nothing
// caught it because no gate runs this file; it is named only in the prose of `benchmarks.md`.
import { renderExoRows } from '@exodra/string';
import type { TExoStrWire } from '@exodra/string';
import { createExoBenchSource } from '../src/benchmarks/shared/createExoBenchSource';

const N = 1000;
const DIST = new URL('./dist/', import.meta.url).pathname;

// ------------------------------------------------- the component, built once
//
// One value: the shape and the wiring that fills it. The wiring runs per instance and is
// deliberately NOT in document order — a wiring function names ports by identity, so the
// order it fills them in must not matter.
const ROW = createExoComponent(
    (b) => {
        let id!: TExoAttrPort;
        let label!: TExoTextPort;
        let mark!: TExoAttrPort;
        let click!: TExoEventPort;
        let count!: TExoTextPort;
        b.el('li', { class: 'row' }, (li) => {
            id = li.port('data-id');
            li.el('span', { class: 'row__label' }, (span) => {
                label = span.textPort();
            });
            li.el('button', { class: 'row__btn' }, (btn) => {
                mark = btn.port('data-b');
                click = btn.eventPort('click');
                count = btn.textPort();
            });
        });
        return { id, label, mark, click, count };
    },
    (P): TExoStrWire<number> =>
        (c, i) => {
            const count = createExoBenchSource(0);
            c.set(P.count, count.getValue());
            c.set(P.click, () => count.setValue(count.getValue() + 1));
            c.set(P.id, i);
            c.set(P.mark, i);
            c.set(P.label, 'Item ' + i);
        }
);

const renderExodra = (): string => '<ul class="list">' + renderExoRows(ROW, N) + '</ul>';

// ------------------------------------------------------------ the built renderers
type TRender = () => string;
const load = async (name: string): Promise<TRender | null> => {
    try {
        const mod = (await import(pathToFileURL(`${DIST}${name}/_server.mjs`).href)) as Record<
            string,
            unknown
        >;
        const fn = (mod.renderBody ?? mod.render) as (() => unknown) | undefined;
        if (fn === undefined) return null;
        // Solid returns `{ body, head, ms }`; the others return the body directly.
        return name === 'solid' ? (): string => (fn() as { body: string }).body : (fn as TRender);
    } catch (error) {
        console.error(`${name} is not built:`, (error as Error).message);
        return null;
    }
};

const solid = await load('solid');
const marko = await load('marko');
// Mikado's SSR module: a template compiled ONCE at module load into a string-concatenation
// function, which is the same shape of thing `renderRows` is. Its bytes carry the `click`
// route attribute per row — the markup is how its delegated listener finds the handler — and
// that shows up in the byte column below, where it belongs.
const mikado = await load('mikado');

// ---------------------------------------------------------------------- the gate
const mine = renderExodra();
console.log(`schema: ${mine.length} bytes`);
if (solid !== null) console.log(`solid:  ${solid().length} bytes  (carries hydration keys)`);
if (marko !== null) console.log(`marko:  ${marko().length} bytes  (carries hydration markers)`);
if (mikado !== null)
    console.log(`mikado: ${mikado().length} bytes  (carries click="inc" on every row)`);
console.log();

// --------------------------------------------------------------------- the timing
const variants: [string, TRender][] = [['exodra', renderExodra]];
if (solid !== null) variants.push(['solid', solid]);
if (marko !== null) variants.push(['marko 6', marko]);
if (mikado !== null) variants.push(['mikado', mikado]);

const ROUNDS = 80;
const WARM = 15;
const times = new Map(variants.map(([name]) => [name, [] as number[]]));
for (const [, fn] of variants) for (let k = 0; k < WARM; k++) fn();
// Round-robin, so a thermal drift over the run hits everybody equally rather than whoever
// happened to go last.
for (let r = 0; r < ROUNDS; r++) {
    for (const [name, fn] of variants) {
        const t0 = performance.now();
        const out = fn();
        const dt = performance.now() - t0;
        if (out.length === 0) throw new Error('unreachable');
        times.get(name)!.push(dt);
    }
}

const rows = variants.map(([name]) => {
    const t = times
        .get(name)!
        .slice()
        .sort((a, b) => a - b);
    return { name, min: t[0], med: t[t.length >> 1] };
});
const best = Math.min(...rows.map((r) => r.min));
console.log(`=== ${N} rows, ${ROUNDS} rounds ===\n`);
console.log('variant                        min      median    vs best');
for (const r of rows) {
    console.log(
        r.name.padEnd(30),
        r.min.toFixed(3).padStart(7),
        r.med.toFixed(3).padStart(9),
        ('×' + (r.min / best).toFixed(2)).padStart(10)
    );
}
console.log();

// ── RECORD IT, IN THE SAME SHAPE THE AXES USE ────────────────────────────────────────────────
//
// The two columns this script feeds — `ms / render` and `bytes emitted` in `benchmarks.md` — were
// marked `unrecorded` for as long as the marker existed, because this file printed and wrote
// nothing. Every other measuring script under `ssr/` already writes a file; this one, the only one
// whose figures are PUBLISHED, did not.
//
// It goes to `measurements/` and not to `.gate/`: that directory is committed precisely because a
// published number's evidence belongs in the repository beside it. `.gate/` is for the A/B pairs
// that mean nothing off the machine that produced them. See `packages/benchmarks/.gitignore`.
//
// `rows` carries the same five statistics an axis recording carries, so `check-doc-numbers.mjs`
// reads it with no special case — but this harness computes only min and median, so the other three
// are written as the median rather than invented. That is stated here rather than left for someone
// to discover by trusting a p25 that is not one. The BYTES are the reason this recording exists at
// all and they are exact, not sampled.
const recording = {
    axis: 'ssr-throughput',
    label: 'published',
    quantum: null,
    batch: 1,
    rounds: ROUNDS,
    rowCount: N,
    note: 'min and median are measured; p25/p75/max repeat the median — this harness does not compute them',
    rows: rows.map((r) => ({
        name: r.name,
        min: r.min,
        p25: r.med,
        median: r.med,
        p75: r.med,
        max: r.med,
    })),
    bytes: Object.fromEntries(variants.map(([name, fn]) => [name, fn().length] as const)),
};
const out = new URL('../measurements/ssr-throughput.published.json', import.meta.url);
writeFileSync(out, JSON.stringify(recording, null, 2));
console.log(
    `📝 recorded ${rows.length} rows → packages/benchmarks/measurements/ssr-throughput.published.json`
);
