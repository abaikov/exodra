import type { TExoSequenceInput } from '../types/TExoSequenceInput';

const COPIES = 16;

function rng(seed: number): () => number {
    let state = seed | 0 || 1;
    return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state;
    };
}

/** `oldOf` as the caller builds it: oldIndex+1 at each position, 0 where the child is new. */
function inOrder(n: number): number[] {
    const out: number[] = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = i + 1;
    return out;
}

function oneMove(n: number, seed: number): number[] {
    const out = inOrder(n);
    const next = rng(seed);
    const from = next() % n;
    const to = next() % n;
    const [taken] = out.splice(from, 1);
    out.splice(to, 0, taken);
    return out;
}

function shuffled(n: number, fraction: number, seed: number): number[] {
    const out = inOrder(n);
    const next = rng(seed);
    const swaps = Math.max(1, Math.round(n * fraction));
    for (let i = 0; i < swaps; i++) {
        const a = next() % n;
        const b = next() % n;
        const held = out[a];
        out[a] = out[b];
        out[b] = held;
    }
    return out;
}

function reversedRun(n: number): number[] {
    const out: number[] = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = n - i;
    return out;
}

/**
 * Arrivals mixed into a reorder, and position 0 is ALWAYS one of them: that is the shape where the
 * shipped pass's `result` array starts at an index whose value is 0 — see what the bench prints
 * about the leading-zero artefact.
 */
function withZeros(n: number, fraction: number, seed: number): number[] {
    const out = shuffled(n, 0.1, seed);
    const next = rng(seed ^ 0x5bf03635);
    const holes = Math.max(1, Math.round(n * fraction));
    out[0] = 0;
    for (let i = 1; i < holes; i++) out[next() % n] = 0;
    return out;
}

function copies(make: (seed: number) => number[]): number[][] {
    const out: number[][] = new Array<number[]>(COPIES);
    for (let i = 0; i < COPIES; i++) out[i] = make(0x2f6e2b1 + i * 7919);
    return out;
}

const SIZES: readonly { n: number; calls: number }[] = [
    { n: 10, calls: 20000 },
    { n: 100, calls: 3000 },
    // The quadratic candidate does half a million iterations per call at this size, so the sample
    // is short in CALLS and long in WORK. That is the only reason this number is not 3000.
    { n: 1000, calls: 100 },
];

const SHAPES: readonly {
    name: string;
    why: string;
    make: (n: number, seed: number) => number[];
}[] = [
    {
        name: 'one-move',
        why: 'one child changed place — n-1 keepers, and the binary search never widens',
        make: (n, seed) => oneMove(n, seed),
    },
    {
        name: 'shuffle-10',
        why: 'a re-sort that disturbs a tenth of the positions — the everyday reorder',
        make: (n, seed) => shuffled(n, 0.1, seed),
    },
    {
        name: 'reverse',
        why: 'the worst case: the keeper set is one child, and every binary search runs full depth',
        make: (n) => reversedRun(n),
    },
    {
        name: 'zeros-20',
        why: 'a fifth of the list is newly arrived, position 0 included — a reorder WITH insertions',
        make: (n, seed) => withZeros(n, 0.2, seed),
    },
];

export const EXO_SEQUENCE_INPUTS: readonly TExoSequenceInput[] = SHAPES.flatMap((shape) =>
    SIZES.map((size) => ({
        name: `${shape.name}·${size.n}`,
        why: shape.why,
        size: size.n,
        calls: size.calls,
        arrays: copies((seed) => shape.make(size.n, seed)),
    }))
);
