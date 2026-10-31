import type { TExoBenchProtoFrame } from '@exodra/bench-harness';
import { exoContextFrame } from '../src/exoContextFrame';
import type { TExoContextFrame } from '../src/types/TExoContextFrame';
import type { TExoContextToken } from '../src/types/TExoContextToken';
import type { TExoContextPushStream } from './types/TExoContextPushStream';
import type { TExoContextPushVariant } from './types/TExoContextPushVariant';

// THE OTHER SIDE OF THE READ TABLE. A design that answers a read in one step pays for it here, and
// a table that shows only one of the two is an argument for whichever design it happened to show.
//
// ONE "CALL" IS ONE WHOLE PROVIDER CHAIN of `depth` links, built from nothing — what a subtree that
// provides at `depth` levels costs to enter.

/** A byte-for-byte second declaration of the shipped cons cell. True Δ = 0. */
function pushTwin<TValue>(
    outer: TExoContextFrame | null,
    key: TExoContextToken<TValue>,
    value: TValue
): TExoContextFrame {
    return { key: key as TExoContextToken<unknown>, value, outer };
}

function driveShipped(stream: TExoContextPushStream): number {
    const tokens = stream.tokens;
    const values = stream.values;
    const depth = stream.depth;
    const sink = stream.sink;
    for (let c = 0; c < stream.chains; c++) {
        let at: TExoContextFrame | null = null;
        for (let d = 0; d < depth; d++) at = exoContextFrame(at, tokens[d], values[d]);
        sink[c & 15] = at;
    }
    return sink[0] === null ? depth : depth + 1;
}

function driveTwin(stream: TExoContextPushStream): number {
    const tokens = stream.tokens;
    const values = stream.values;
    const depth = stream.depth;
    const sink = stream.sink;
    for (let c = 0; c < stream.chains; c++) {
        let at: TExoContextFrame | null = null;
        for (let d = 0; d < depth; d++) at = pushTwin(at, tokens[d], values[d]);
        sink[c & 15] = at;
    }
    return sink[0] === null ? depth : depth + 1;
}

/** O(depth) PER PROVIDE and O(depth²) per chain: a frame that answers in one step has to carry
 * everything its outer frame carried, and it may not mutate that one — shadowing is what a context
 * is for, and `read-exo-context.test.ts:57-62` pins the outer frame surviving an inner provide. */
function driveFlatMap(stream: TExoContextPushStream): number {
    const tokens = stream.tokens;
    const values = stream.values;
    const depth = stream.depth;
    const sink = stream.sink;
    for (let c = 0; c < stream.chains; c++) {
        let at = new Map<TExoContextToken<unknown>, unknown>();
        for (let d = 0; d < depth; d++) {
            const next = new Map(at);
            next.set(tokens[d] as TExoContextToken<unknown>, values[d]);
            at = next;
        }
        sink[c & 15] = at;
    }
    return sink[0] === null ? depth : depth + 1;
}

function driveFlatProto(stream: TExoContextPushStream): number {
    const protoTokens = stream.protoTokens;
    const values = stream.values;
    const depth = stream.depth;
    const sink = stream.sink;
    for (let c = 0; c < stream.chains; c++) {
        let at = Object.create(null) as TExoBenchProtoFrame;
        for (let d = 0; d < depth; d++) {
            const next = Object.create(at) as TExoBenchProtoFrame;
            next[protoTokens[d].at] = values[d];
            at = next;
        }
        sink[c & 15] = at;
    }
    return sink[0] === null ? depth : depth + 1;
}

/**
 * THE NATIVE FLOOR: a hand-written program provides nothing. It passes the value as an argument,
 * and the cost of that is the store the caller was going to make anyway.
 *
 * WHAT IT SKIPS, NAMED: every descendant that wants the value has to be given it explicitly, by
 * every component in between, whether or not that component cares. This row is the honest zero the
 * other four are measured against, not a design anybody can select.
 */
function driveFloor(stream: TExoContextPushStream): number {
    const values = stream.values;
    const depth = stream.depth;
    const sink = stream.sink;
    for (let c = 0; c < stream.chains; c++) {
        sink[c & 15] = values[depth - 1];
    }
    return sink[0] === null ? depth : depth + 1;
}

function verifyShipped(stream: TExoContextPushStream): readonly (string | undefined)[] {
    let at: TExoContextFrame | null = null;
    for (let d = 0; d < stream.depth; d++)
        at = exoContextFrame(at, stream.tokens[d], stream.values[d]);
    const out: (string | undefined)[] = [];
    for (let d = 0; d < stream.depth; d++) {
        let walk = at;
        let found: string | undefined;
        while (walk !== null) {
            if (walk.key === (stream.tokens[d] as TExoContextToken<unknown>)) {
                found = walk.value as string;
                break;
            }
            walk = walk.outer;
        }
        out.push(found);
    }
    return out;
}

function verifyTwin(stream: TExoContextPushStream): readonly (string | undefined)[] {
    let at: TExoContextFrame | null = null;
    for (let d = 0; d < stream.depth; d++) at = pushTwin(at, stream.tokens[d], stream.values[d]);
    const out: (string | undefined)[] = [];
    for (let d = 0; d < stream.depth; d++) {
        let walk = at;
        let found: string | undefined;
        while (walk !== null) {
            if (walk.key === (stream.tokens[d] as TExoContextToken<unknown>)) {
                found = walk.value as string;
                break;
            }
            walk = walk.outer;
        }
        out.push(found);
    }
    return out;
}

function verifyFlatMap(stream: TExoContextPushStream): readonly (string | undefined)[] {
    let at = new Map<TExoContextToken<unknown>, unknown>();
    for (let d = 0; d < stream.depth; d++) {
        const next = new Map(at);
        next.set(stream.tokens[d] as TExoContextToken<unknown>, stream.values[d]);
        at = next;
    }
    const out: (string | undefined)[] = [];
    for (let d = 0; d < stream.depth; d++) {
        out.push(at.get(stream.tokens[d] as TExoContextToken<unknown>) as string | undefined);
    }
    return out;
}

function verifyFlatProto(stream: TExoContextPushStream): readonly (string | undefined)[] {
    let at = Object.create(null) as TExoBenchProtoFrame;
    for (let d = 0; d < stream.depth; d++) {
        const next = Object.create(at) as TExoBenchProtoFrame;
        next[stream.protoTokens[d].at] = stream.values[d];
        at = next;
    }
    const out: (string | undefined)[] = [];
    for (let d = 0; d < stream.depth; d++) {
        out.push(at[stream.protoTokens[d].at] as string | undefined);
    }
    return out;
}

/** The floor's answer is the values themselves: a hand-written program has them in hand. */
function verifyFloor(stream: TExoContextPushStream): readonly (string | undefined)[] {
    return stream.values;
}

export const EXO_CONTEXT_PUSH_VARIANTS: readonly TExoContextPushVariant[] = [
    { name: 'shipped', drive: driveShipped, verify: verifyShipped },
    { name: 'shipped·twin', drive: driveTwin, verify: verifyTwin },
    { name: 'flat·map', drive: driveFlatMap, verify: verifyFlatMap },
    { name: 'flat·proto', drive: driveFlatProto, verify: verifyFlatProto },
    { name: 'floor·arg', drive: driveFloor, verify: verifyFloor },
];
