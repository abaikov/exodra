import type { TExoBenchInput } from '@exodra/bench-harness';
import { exoContextReadStream } from '../exoContextReadStream';
import type { TExoContextReadStream } from '../types/TExoContextReadStream';

// DEPTH IS THE SHAPE, not a number: the SLOPE between `d1` and `d8` is the per-link cost and the
// INTERCEPT is the call itself. One depth would give a figure nobody could extrapolate from.
export const EXO_CONTEXT_READ_INPUTS: readonly TExoBenchInput<TExoContextReadStream>[] = [
    {
        name: 'd1',
        why: 'the innermost provide — one pointer compare, the best the chain can do',
        build: (calls) => exoContextReadStream(8, 1, calls),
        size: (stream) => stream.chains.length,
    },
    {
        name: 'd2',
        why: 'one link further, over the same chain of 8 — the second point of the slope',
        build: (calls) => exoContextReadStream(8, 2, calls),
        size: (stream) => stream.chains.length,
    },
    {
        name: 'd8',
        why: 'the outermost of 8 — a value provided at the page root and read in a leaf',
        build: (calls) => exoContextReadStream(8, 8, calls),
        size: (stream) => stream.chains.length,
    },
    {
        name: 'd32',
        why: '32 links, the target at the far end — where a chain walk stops being free',
        build: (calls) => exoContextReadStream(32, 32, calls),
        size: (stream) => stream.chains.length,
    },
    {
        name: 'miss·d8',
        why: 'a key nobody provided: the walk runs to the end — what a component with a fallback pays',
        build: (calls) => exoContextReadStream(8, 0, calls),
        size: (stream) => stream.chains.length,
    },
];
