import type { TExoBenchProtoToken } from '@exodra/bench-harness';
import { exoContextToken } from '../src/exoContextToken';
import type { TExoContextToken } from '../src/types/TExoContextToken';
import type { TExoContextPushStream } from './types/TExoContextPushStream';

/**
 * `calls` is divided by `depth` so a sample at depth 16 does the same total number of PROVIDES as
 * one at depth 1 — otherwise the deep rows would allocate sixteen times as much and the table would
 * be ranking garbage-collector pressure across inputs instead of the designs within one.
 */
export function exoContextPushStream(depth: number, calls: number): TExoContextPushStream {
    const tokens: TExoContextToken<string>[] = [];
    const protoTokens: TExoBenchProtoToken[] = [];
    const values: string[] = [];
    for (let d = 0; d < depth; d++) {
        tokens.push(exoContextToken<string>('k' + d));
        protoTokens.push({ at: Symbol('k' + d) });
        values.push('v' + d);
    }
    // Sixteen slots, indexed by `c & 15` in every driver, so the last sixteen chains a sample built
    // stay reachable and no allocation can be folded away as dead.
    const sink: unknown[] = new Array<unknown>(16).fill(null);
    return {
        tokens,
        protoTokens,
        values,
        depth,
        chains: Math.max(1, Math.floor(calls / depth)),
        sink,
    };
}
