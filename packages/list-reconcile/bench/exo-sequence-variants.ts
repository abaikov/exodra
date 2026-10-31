import { getExoSequence } from '../src/getExoSequence';
import type { TExoSequenceVariant } from './types/TExoSequenceVariant';

// EVERY VARIANT CARRIES ITS OWN LOOP. A shared driver taking the implementation as a parameter
// would make the call megamorphic for every row alike — a tax the one real call site
// (`reconcileExoOrder.ts:66`, a direct call to one function) does not pay.
//
// The arrays are cycled with `& 15`, so every variant pays the same mask and none of them can be
// answering about one array that stayed in cache.

function twinSequence(arr: number[]): number[] {
    const p = arr.slice();
    const result: number[] = [0];
    const len = arr.length;
    let i: number, j: number, u: number, v: number, c: number;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) u = c + 1;
                else v = c;
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) p[i] = result[u - 1];
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

// Two module arrays instead of two allocations per call. `packages/benchmarks/src/benchmarks/axes/floors/update-floor.ts`
// at :1727 names this as the open question and says nobody has looked; this row is the look.
// THE PRICE: the returned array is SHARED, so a caller that keeps it past the next call keeps a
// lie. `reconcileExoOrder` reads it inside the same function and keeps nothing.
const REUSE_P: number[] = [];
const REUSE_RESULT: number[] = [];

function growPacked(target: number[], len: number): void {
    while (target.length < len) target.push(0);
}

function reuseSequence(arr: number[]): number[] {
    const len = arr.length;
    const p = REUSE_P;
    growPacked(p, len);
    for (let k = 0; k < len; k++) p[k] = arr[k];
    const result = REUSE_RESULT;
    result.length = 1;
    result[0] = 0;
    let i: number, j: number, u: number, v: number, c: number;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) u = c + 1;
                else v = c;
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) p[i] = result[u - 1];
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

// The obvious quadratic one. It is not a floor — there is no straight-line program that answers
// this question — it is the ALTERNATIVE ALGORITHM, and at these sizes it is also the reference the
// gate measures maximality against.
function naiveSequence(arr: number[]): number[] {
    const n = arr.length;
    const best: number[] = new Array<number>(n).fill(0);
    const from: number[] = new Array<number>(n).fill(-1);
    let bestLen = 0;
    let bestEnd = -1;
    for (let i = 0; i < n; i++) {
        if (arr[i] === 0) continue;
        best[i] = 1;
        for (let j = 0; j < i; j++) {
            if (arr[j] !== 0 && arr[j] < arr[i] && best[j] + 1 > best[i]) {
                best[i] = best[j] + 1;
                from[i] = j;
            }
        }
        if (best[i] > bestLen) {
            bestLen = best[i];
            bestEnd = i;
        }
    }
    const out: number[] = new Array<number>(bestLen);
    let at = bestEnd;
    for (let k = bestLen - 1; k >= 0; k--) {
        out[k] = at;
        at = from[at];
    }
    return out;
}

// THE STRATEGY ROW, not a floor: the longest increasing RUN, one linear pass, no allocation but
// the answer. It keeps fewer children than the LIS does, and every child it fails to keep is one
// more `insertBefore` — so its column is only worth what a move costs.
function runSequence(arr: number[]): number[] {
    const len = arr.length;
    let bestStart = 0;
    let bestLen = 0;
    let start = 0;
    let run = 0;
    let previous = 0;
    for (let i = 0; i < len; i++) {
        const value = arr[i];
        if (value === 0) {
            run = 0;
            continue;
        }
        if (run > 0 && value > previous) {
            run++;
        } else {
            run = 1;
            start = i;
        }
        previous = value;
        if (run > bestLen) {
            bestLen = run;
            bestStart = start;
        }
    }
    const out: number[] = new Array<number>(bestLen);
    for (let k = 0; k < bestLen; k++) out[k] = bestStart + k;
    return out;
}

function driveShipped(arrays: readonly number[][], calls: number): number {
    let acc = 0;
    for (let i = 0; i < calls; i++) acc += getExoSequence(arrays[i & 15]).length;
    return acc;
}

function driveTwin(arrays: readonly number[][], calls: number): number {
    let acc = 0;
    for (let i = 0; i < calls; i++) acc += twinSequence(arrays[i & 15]).length;
    return acc;
}

function driveReuse(arrays: readonly number[][], calls: number): number {
    let acc = 0;
    for (let i = 0; i < calls; i++) acc += reuseSequence(arrays[i & 15]).length;
    return acc;
}

function driveNaive(arrays: readonly number[][], calls: number): number {
    let acc = 0;
    for (let i = 0; i < calls; i++) acc += naiveSequence(arrays[i & 15]).length;
    return acc;
}

function driveRun(arrays: readonly number[][], calls: number): number {
    let acc = 0;
    for (let i = 0; i < calls; i++) acc += runSequence(arrays[i & 15]).length;
    return acc;
}

export const EXO_SEQUENCE_VARIANTS: readonly TExoSequenceVariant[] = [
    { name: 'shipped', differs: null, answer: getExoSequence, drive: driveShipped },
    { name: 'shipped·twin', differs: null, answer: twinSequence, drive: driveTwin },
    {
        name: 'reuse·buf',
        differs:
            'the same indices in a SHARED array — a caller that retains it past the next call ' +
            'retains a lie. The one caller reads it inside the statement that asks for it.',
        answer: reuseSequence,
        drive: driveReuse,
    },
    {
        name: 'naive·n²',
        differs:
            'the same LENGTH by a different route, and it may pick different members — any ' +
            'maximal increasing subsequence leaves the same number of children unmoved.',
        answer: naiveSequence,
        drive: driveNaive,
    },
    {
        name: 'run·linear',
        differs:
            'FEWER keepers: the longest increasing RUN, not subsequence. Every keeper it gives ' +
            'up is one more insertBefore, and the gate prints how many that is per shape.',
        answer: runSequence,
        drive: driveRun,
    },
];
