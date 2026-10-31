import type { TExoBenchInput } from '@exodra/bench-harness';

// A CODE POINT AND NOT A LITERAL: U+00A0 is one of the characters under test and no editor, diff or
// review shows it.
const NBSP = String.fromCharCode(0x00a0);

// Pools rather than one repeated literal, so no row can be answering about a string V8 has already
// interned an answer for. The stream is built OUTSIDE every timed region and read by index, so the
// argument is a load and not a constant a compiler could fold the whole call away against.
const POOL = 64;

function poolOf(make: (i: number) => string): readonly string[] {
    const out: string[] = new Array<string>(POOL);
    for (let i = 0; i < POOL; i++) out[i] = make(i);
    return out;
}

function streamOf(pool: readonly string[], calls: number): readonly string[] {
    const out: string[] = new Array<string>(calls);
    for (let i = 0; i < calls; i++) out[i] = pool[i % pool.length];
    return out;
}

// ~28 characters, which is the size the recorded SSR census renders: 1000 rows × 5 ports → 140 kB.
const CLEAN_SHORT = poolOf((i) => `Order ${1000 + i} shipped to Berlin`);
const CLEAN_LONG = poolOf(
    (i) =>
        `Shipment ${1000 + i} left the Berlin depot on the second of the month and is expected ` +
        'at the destination warehouse within four working days, customs permitting.'
);
const DIRTY_ONE = poolOf((i) => `Tom & Jerry, table ${i}`);
const DIRTY_DENSE = poolOf(
    (i) => `<b>row ${i}</b> & <i>alt</i> & <em>note</em> & <u>tail</u> & <s>end</s>`
);
const DIRTY_NBSP = poolOf((i) => `Preis:${NBSP}${i},99${NBSP}EUR`);
const EMPTY = poolOf(() => '');

// FOUR CLEAN TO ONE DIRTY, and the clean side is not decoration: auditing the recorded SSR census
// found ZERO of its 1000 rows carrying an escapable character, so all 4000 of its calls took the
// test-and-return path. One dirty value in five is already pessimistic for a page of names,
// prices and dates.
const MIXED = poolOf((i) =>
    i % 5 === 4 ? `Tom & Jerry, table ${i}` : `Order ${1000 + i} shipped to Berlin`
);

const ATTR_CLEAN = poolOf((i) => `/orders/${1000 + i}/detail`);
const ATTR_DIRTY = poolOf((i) => `/search?q=a"b&c=${i}&d=<e>`);
const ATTR_MIXED = poolOf((i) =>
    i % 5 === 4 ? `/search?q=a"b&c=${i}` : `/orders/${1000 + i}/detail`
);

/** Rows that do not produce this input's bytes. Named once; every dirty input carries it. */
const DIFFERENT_BYTES: readonly string[] = ['pass'];

function inputOf(
    name: string,
    pool: readonly string[],
    why: string,
    bounds?: readonly string[]
): TExoBenchInput<readonly string[]> {
    return {
        name: name,
        why: why,
        build: (calls: number): readonly string[] => streamOf(pool, calls),
        size: (stream: readonly string[]): number => stream.length,
        bounds: bounds,
    };
}

/**
 * An escaper that is fast only on clean data is an escaper nobody measured on the day it mattered.
 * The clean rows are the recorded census's population; the dirty rows are the other end of that
 * scale, which the recorded axis priced at 7.6× the clean one on its own data.
 */
export const EXO_ESCAPE_TEXT_INPUTS: readonly TExoBenchInput<readonly string[]>[] = [
    inputOf(
        'clean·short',
        CLEAN_SHORT,
        'a 28-character value with nothing to escape — the shape of almost every text port'
    ),
    inputOf(
        'clean·long',
        CLEAN_LONG,
        'the same answer over 150 characters — whether the guard scans or exits lucky'
    ),
    inputOf(
        'dirty·one',
        DIRTY_ONE,
        'one ampersand in a short value — the common dirty case',
        DIFFERENT_BYTES
    ),
    inputOf(
        'dirty·dense',
        DIRTY_DENSE,
        'markup that arrived as data: nine hits in seventy characters',
        DIFFERENT_BYTES
    ),
    inputOf(
        'dirty·nbsp',
        DIRTY_NBSP,
        'U+00A0 only — the hit no ASCII fast path catches and the one that must survive',
        DIFFERENT_BYTES
    ),
    inputOf(
        'mixed',
        MIXED,
        'four clean to one dirty — a page of names and prices with a firm name in it',
        DIFFERENT_BYTES
    ),
    inputOf('empty', EMPTY, 'the empty string — every text port a wire left unset writes one'),
];

export const EXO_ESCAPE_ATTR_INPUTS: readonly TExoBenchInput<readonly string[]>[] = [
    inputOf(
        'clean·href',
        ATTR_CLEAN,
        'a path with nothing to escape — what an href port carries all day'
    ),
    inputOf(
        'dirty·query',
        ATTR_DIRTY,
        'a query string with a quote, two ampersands and a pair of angle brackets',
        DIFFERENT_BYTES
    ),
    inputOf('mixed', ATTR_MIXED, 'four clean to one dirty, as above', DIFFERENT_BYTES),
];
