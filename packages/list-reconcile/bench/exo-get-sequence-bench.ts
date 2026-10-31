import { EXO_SEQUENCE_INPUTS } from './constants/exo-sequence-inputs';
import {
    exoBenchGrainRefusal,
    exoBenchLine,
    exoBenchRefuse,
    exoBenchResolution,
    exoBenchStat,
    exoBenchTable,
    exoClockGrainMs,
} from './exo-bench-report';
import { EXO_SEQUENCE_VARIANTS } from './exo-sequence-variants';
import type { TExoBenchRow } from './types/TExoBenchRow';
import type { TExoSequenceInput } from './types/TExoSequenceInput';

// `getExoSequence` — the longest-increasing-subsequence pass — against a twin, a buffer-reusing
// copy, the obvious quadratic one and a linear approximation that keeps FEWER children. There is no
// straight-line floor for this question: a program with no abstraction does not compute an LIS, it
// moves every child. `run·linear` and the move counts printed at each gate are what that costs.

const FLOOR = 'run·linear';
const UNIT = 'ns/call';

let sink = 0;

type TExoSequenceCheck = {
    readonly ok: boolean;
    readonly keepers: number;
    readonly leadingZero: boolean;
    readonly why: string;
};

/**
 * A returned sequence is valid when its indices ascend and the `oldOf` values at them ascend and
 * are non-zero. ONE EXCEPTION IS TOLERATED AND COUNTED: the shipped pass seeds its `result` with
 * index 0 and never revisits that slot when position 0 holds a 0, so the first index it returns can
 * name a child that is NEW. It is inert at the only call site — `reconcileExoOrder.ts:68` skips
 * every `old[k] === 0` before it marks a row as staying — but it is real, and a second reader of
 * this function would trip over it.
 */
function checkSequence(arr: readonly number[], seq: readonly number[]): TExoSequenceCheck {
    if (seq.length === 0) return { ok: true, keepers: 0, leadingZero: false, why: '' };
    const leadingZero = arr[seq[0]] === 0;
    let previousIndex = -1;
    let previousValue = 0;
    for (let k = 0; k < seq.length; k++) {
        const index = seq[k];
        if (index <= previousIndex) {
            return {
                ok: false,
                keepers: 0,
                leadingZero,
                why: `index ${index} at ${k} does not ascend`,
            };
        }
        previousIndex = index;
        if (k === 0 && leadingZero) continue;
        const value = arr[index];
        if (value === 0) {
            return { ok: false, keepers: 0, leadingZero, why: `position ${index} is a new child` };
        }
        if (value <= previousValue) {
            return { ok: false, keepers: 0, leadingZero, why: `value ${value} at ${index} falls` };
        }
        previousValue = value;
    }
    return {
        ok: true,
        keepers: seq.length - (leadingZero ? 1 : 0),
        leadingZero,
        why: '',
    };
}

function gateInput(input: TExoSequenceInput): boolean {
    const shipped = EXO_SEQUENCE_VARIANTS[0];
    const naive = EXO_SEQUENCE_VARIANTS.find((v) => v.name === 'naive·n²');
    if (naive === undefined) {
        exoBenchRefuse(`${input.name}: no maximality reference in this field — NOTHING TIMED.`);
        return false;
    }
    let bad = 0;
    let artefacts = 0;
    let keepers = 0;
    let runKeepers = 0;
    for (const arr of input.arrays) {
        const want = naive.answer(arr.slice()).slice();
        const wantCheck = checkSequence(arr, want);
        const reference = shipped.answer(arr.slice()).slice();
        for (const variant of EXO_SEQUENCE_VARIANTS) {
            const got = variant.answer(arr.slice()).slice();
            const check = checkSequence(arr, got);
            if (!check.ok) {
                bad++;
                exoBenchRefuse(`GATE ${input.name}/${variant.name}: ${check.why}`);
                continue;
            }
            if (check.leadingZero) artefacts++;
            if (variant.name === 'run·linear') {
                runKeepers += check.keepers;
                continue;
            }
            if (check.keepers !== wantCheck.keepers) {
                bad++;
                exoBenchRefuse(
                    `GATE ${input.name}/${variant.name}: keeps ${check.keepers} children where ` +
                        `the quadratic reference keeps ${wantCheck.keepers} — not maximal.`
                );
                continue;
            }
            if (variant.name === 'shipped') keepers += check.keepers;
            if (variant.name !== 'shipped·twin' && variant.name !== 'reuse·buf') continue;
            if (got.length !== reference.length || got.some((at, k) => at !== reference[k])) {
                bad++;
                exoBenchRefuse(
                    `GATE ${input.name}/${variant.name}: same length, DIFFERENT members than ` +
                        'shipped — this row is meant to be the same program.'
                );
            }
        }
    }
    if (bad > 0) {
        exoBenchRefuse(`${input.name}: GATE FAILED on ${bad} answers — NOTHING TIMED.`);
        return false;
    }
    const copies = input.arrays.length;
    exoBenchLine(
        `  gate: every answer is a valid increasing subsequence; shipped keeps ` +
            `${(keepers / copies).toFixed(1)} of ${input.size} children, run·linear keeps ` +
            `${(runKeepers / copies).toFixed(1)} — so run·linear costs ` +
            `${((keepers - runKeepers) / copies).toFixed(1)} extra insertBefore calls per update.`
    );
    if (artefacts > 0) {
        exoBenchLine(
            `  note: the leading index named a NEW child in ${artefacts} of ` +
                `${copies * EXO_SEQUENCE_VARIANTS.length} answers — the seeded \`result[0]\`, ` +
                'inert at reconcileExoOrder.ts:68 and counted rather than failed.'
        );
    }
    return true;
}

function sampleOnce(
    variant: (typeof EXO_SEQUENCE_VARIANTS)[number],
    input: TExoSequenceInput
): number {
    const started = performance.now();
    const accumulated = variant.drive(input.arrays, input.calls);
    const elapsed = performance.now() - started;
    sink += accumulated;
    return (elapsed * 1e6) / input.calls;
}

function runInput(
    input: TExoSequenceInput,
    rounds: number,
    grainMs: number,
    forceGc: (() => void) | undefined
): void {
    exoBenchLine('');
    exoBenchLine(`${input.name} — ${input.why}`);
    if (!gateInput(input)) return;

    const samples: Record<string, number[]> = {};
    for (const variant of EXO_SEQUENCE_VARIANTS) samples[variant.name] = [];
    for (let w = 0; w < 8; w++) {
        for (const variant of EXO_SEQUENCE_VARIANTS) sampleOnce(variant, input);
    }

    const regionsMs: Record<string, number> = {};
    for (const variant of EXO_SEQUENCE_VARIANTS) regionsMs[variant.name] = Number.POSITIVE_INFINITY;
    const count = EXO_SEQUENCE_VARIANTS.length;
    for (let round = 0; round < rounds; round++) {
        const shift = round % count;
        const forward = (round & 1) === 0;
        for (let k = 0; k < count; k++) {
            const at = forward ? (k + shift) % count : (shift + count - 1 - k) % count;
            const variant = EXO_SEQUENCE_VARIANTS[at];
            if (forceGc !== undefined) forceGc();
            const perCall = sampleOnce(variant, input);
            const regionMs = (perCall * input.calls) / 1e6;
            if (regionMs < regionsMs[variant.name]) regionsMs[variant.name] = regionMs;
            samples[variant.name].push(perCall);
        }
    }

    const rows: TExoBenchRow[] = EXO_SEQUENCE_VARIANTS.map((variant) => ({
        name: variant.name,
        stat: exoBenchStat(samples[variant.name]),
    })).sort((a, b) => a.stat.median - b.stat.median);
    exoBenchTable(rows, FLOOR, UNIT);
    exoBenchResolution(input.name, samples['shipped'], samples['shipped·twin'], rows, grainMs, UNIT);
    exoBenchGrainRefusal(
        input.name,
        regionsMs,
        grainMs,
        `Raise \`calls\` for size ${input.size} in constants/exo-sequence-inputs.ts.`
    );
}

function reportCallSites(): void {
    exoBenchLine('');
    exoBenchLine('WHAT A WIN HERE BUYS — every caller of getExoSequence in this repository:');
    exoBenchLine(
        '  packages/list-reconcile/src/reconcileExoOrder.ts:66 — and ONLY WHEN the survivors of the ' +
            'middle changed order. An append, a prepend, a contiguous insert, a removal and a ' +
            'no-change all leave them ascending, so this function is not called at all on any of ' +
            'them. It is a REORDER cost.'
    );
    exoBenchLine(
        '  packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts:2092 — the R2 rung. ' +
            'That file says at :1727 that nobody has looked at the two allocations per call, and ' +
            'at :1795 that R1-R6 have never been executed. `reuse·buf` above is that look.'
    );
    exoBenchLine(
        '  packages/term/src/reconcile-exo-term-rows.ts:4 — deliberately does NOT call it, and ' +
            'says so: a terminal region is an array, and moving inside an array is a copy.'
    );
}

function exoGetSequenceBench(): void {
    const args = process.argv.slice(2);
    const rounds = Number(args[0] ?? '25');
    if (!Number.isFinite(rounds) || rounds < 2) {
        exoBenchRefuse(`usage: <rounds:int≥2>; got ${args.join(' ')}`);
        return;
    }
    const forceGc = (globalThis as { gc?: () => void }).gc;
    const grainMs = exoClockGrainMs();

    exoBenchLine(
        `getExoSequence — ${EXO_SEQUENCE_VARIANTS.length} variants × ` +
            `${EXO_SEQUENCE_INPUTS.length} shapes [${UNIT}]`
    );
    exoBenchLine(
        `  ${rounds} rounds · interleaved, direction alternating · clock grain ` +
            `${grainMs.toFixed(6)} ms · GC between samples: ` +
            (forceGc === undefined ? 'NO (run node with --expose-gc to force it)' : 'yes')
    );
    exoBenchLine(
        '  ×floor is against run·linear, which is NOT a floor for this question but the cheapest ' +
            'thing that answers a weaker one. Read it with the extra insertBefore count the gate ' +
            'prints for that shape: the LIS is worth its time only while a move costs more.'
    );

    for (const input of EXO_SEQUENCE_INPUTS) runInput(input, rounds, grainMs, forceGc);

    reportCallSites();
    for (const variant of EXO_SEQUENCE_VARIANTS) {
        if (variant.differs === null) continue;
        exoBenchLine(`  ${variant.name} — ${variant.differs}`);
    }
    exoBenchLine('');
    exoBenchLine(`sink ${sink} — printed so no accumulator in a driver can be dropped.`);
}

exoGetSequenceBench();
