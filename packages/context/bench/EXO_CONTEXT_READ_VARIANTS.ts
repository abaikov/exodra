import { readExoContext } from '../src/readExoContext';
import type { TExoContextFrame } from '../src/types/TExoContextFrame';
import type { TExoContextToken } from '../src/types/TExoContextToken';
import type { TExoContextReadStream } from './types/TExoContextReadStream';
import type { TExoContextReadVariant } from './types/TExoContextReadVariant';

// EVERY VARIANT CARRIES ITS OWN LOOP. A shared driver would make the lookup megamorphic for every
// row alike, which is a tax `TExoBaseNodeMethods.inject` (packages/core/src/plugins/constants/EXO_BASE_NODE_VOCABULARY.ts)
// does not pay: one call site, one implementation.
//
// THE THREE DESIGNS ARE NOT INTERCHANGEABLE, and the epilogue says so with the push table beside
// this one. The chain is O(depth) to read and O(1) to provide; the map is O(1) to read and O(depth)
// to provide; the prototype frame is O(1) on both and needs the token to carry a symbol, which the
// shipped `TExoContextToken` does not have.

/** A byte-for-byte second declaration of the shipped walk, over its own chains. True Δ = 0. */
function readTwin<TValue>(
    frame: TExoContextFrame | null,
    key: TExoContextToken<TValue>
): TValue | undefined {
    let at = frame;
    while (at !== null) {
        if (at.key === (key as TExoContextToken<unknown>)) return at.value as TValue;
        at = at.outer;
    }
    return undefined;
}

function driveShipped(stream: TExoContextReadStream): number {
    const chains = stream.chains;
    const key = stream.key;
    let acc = 0;
    for (let i = 0; i < chains.length; i++) {
        const found = readExoContext(chains[i], key);
        if (found !== undefined) acc += found.length;
    }
    return acc;
}

function driveTwin(stream: TExoContextReadStream): number {
    const chains = stream.twinChains;
    const key = stream.key;
    let acc = 0;
    for (let i = 0; i < chains.length; i++) {
        const found = readTwin(chains[i], key);
        if (found !== undefined) acc += found.length;
    }
    return acc;
}

function driveFlatMap(stream: TExoContextReadStream): number {
    const flats = stream.flats;
    const key = stream.key as TExoContextToken<unknown>;
    let acc = 0;
    for (let i = 0; i < flats.length; i++) {
        const found = flats[i].get(key) as string | undefined;
        if (found !== undefined) acc += found.length;
    }
    return acc;
}

function driveFlatProto(stream: TExoContextReadStream): number {
    const frames = stream.protoFrames;
    const at = stream.protoKey.at;
    let acc = 0;
    for (let i = 0; i < frames.length; i++) {
        const found = frames[i][at] as string | undefined;
        if (found !== undefined) acc += found.length;
    }
    return acc;
}

/**
 * THE NATIVE FLOOR: a hand-written component was HANDED the value — as a parameter, a field, or a
 * module-level constant — so its call site does one load and searches nothing.
 *
 * WHAT IT SKIPS, NAMED: it cannot be shadowed, it cannot be provided by an ancestor that does not
 * know its descendants, and on the `miss` input it is not a miss at all — a program with no value
 * to read does not ask. The gap to it is what a context BUYS.
 */
function driveFloor(stream: TExoContextReadStream): number {
    const holders = stream.holders;
    let acc = 0;
    for (let i = 0; i < holders.length; i++) {
        const found = holders[i].value;
        if (found !== undefined) acc += found.length;
    }
    return acc;
}

export const EXO_CONTEXT_READ_VARIANTS: readonly TExoContextReadVariant[] = [
    {
        name: 'shipped',
        drive: driveShipped,
        answer: (stream, i) => readExoContext(stream.chains[i], stream.key),
    },
    {
        name: 'shipped·twin',
        drive: driveTwin,
        answer: (stream, i) => readTwin(stream.twinChains[i], stream.key),
    },
    {
        name: 'flat·map',
        drive: driveFlatMap,
        answer: (stream, i) =>
            stream.flats[i].get(stream.key as TExoContextToken<unknown>) as string | undefined,
    },
    {
        name: 'flat·proto',
        drive: driveFlatProto,
        answer: (stream, i) => stream.protoFrames[i][stream.protoKey.at] as string | undefined,
    },
    {
        name: 'floor·field',
        drive: driveFloor,
        answer: (stream, i) => stream.holders[i].value,
    },
];
