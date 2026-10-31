import type { TExoBenchInput } from '@exodra/bench-harness';
import { exoContextPushStream } from '../exoContextPushStream';
import type { TExoContextPushStream } from '../types/TExoContextPushStream';

// ONE CALL IS ONE WHOLE CHAIN of that depth, so a row here is directly comparable with the read row
// at the same depth: together they say what a design costs to enter a subtree and to be asked once.
export const EXO_CONTEXT_PUSH_INPUTS: readonly TExoBenchInput<TExoContextPushStream>[] = [
    {
        name: 'push·d1',
        why: 'one provide — the whole provider path of a page with a single root context',
        build: (calls) => exoContextPushStream(1, calls),
        size: (stream) => stream.chains,
    },
    {
        name: 'push·d4',
        why: 'four nested providers, which is what a router plus a theme plus a store looks like',
        build: (calls) => exoContextPushStream(4, calls),
        size: (stream) => stream.chains,
    },
    {
        name: 'push·d16',
        why: 'sixteen — where copying a frame per provide stops being a rounding error',
        build: (calls) => exoContextPushStream(16, calls),
        size: (stream) => stream.chains,
    },
];
