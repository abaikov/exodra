import type {
    TExoBenchHolder,
    TExoBenchProtoFrame,
    TExoBenchProtoToken,
} from '@exodra/bench-harness';
import { exoContextToken } from '../src/exoContextToken';
import { exoContextFrame } from '../src/exoContextFrame';
import type { TExoContextFrame } from '../src/types/TExoContextFrame';
import type { TExoContextToken } from '../src/types/TExoContextToken';
import type { TExoContextReadStream } from './types/TExoContextReadStream';

const INSTANCES = 16;

/**
 * Builds `INSTANCES` chains of `depth` links in each of the four representations, then spreads them
 * over arrays of length `calls`.
 *
 * `at` is the target key's DISTANCE from the frame being read — 1 is the innermost provide, `depth`
 * the outermost, and 0 means a key nobody provided, which is what a component with a fallback pays.
 */
export function exoContextReadStream(
    depth: number,
    at: number,
    calls: number
): TExoContextReadStream {
    const tokens: TExoContextToken<string>[] = [];
    const protoTokens: TExoBenchProtoToken[] = [];
    for (let d = 0; d < depth; d++) {
        tokens.push(exoContextToken<string>('k' + d));
        protoTokens.push({ at: Symbol('k' + d) });
    }
    const missToken = exoContextToken<string>('absent');
    const missProto: TExoBenchProtoToken = { at: Symbol('absent') };
    // Pushed in order, so the LAST token pushed is one link away and `tokens[0]` is `depth` away.
    const target = at === 0 ? -1 : depth - at;

    const chainPool: TExoContextFrame[] = [];
    const twinPool: TExoContextFrame[] = [];
    const flatPool: Array<ReadonlyMap<TExoContextToken<unknown>, unknown>> = [];
    const protoPool: TExoBenchProtoFrame[] = [];
    const holderPool: TExoBenchHolder[] = [];

    for (let n = 0; n < INSTANCES; n++) {
        let chain: TExoContextFrame | null = null;
        let twin: TExoContextFrame | null = null;
        const flat = new Map<TExoContextToken<unknown>, unknown>();
        let proto = Object.create(null) as TExoBenchProtoFrame;
        for (let d = 0; d < depth; d++) {
            const value = 'v' + n + '-' + d;
            chain = exoContextFrame(chain, tokens[d], value);
            twin = exoContextFrame(twin, tokens[d], value);
            flat.set(tokens[d] as TExoContextToken<unknown>, value);
            const next = Object.create(proto) as TExoBenchProtoFrame;
            next[protoTokens[d].at] = value;
            proto = next;
        }
        chainPool.push(chain as TExoContextFrame);
        twinPool.push(twin as TExoContextFrame);
        flatPool.push(flat);
        protoPool.push(proto);
        holderPool.push({ value: target === -1 ? undefined : 'v' + n + '-' + target });
    }

    const chains: TExoContextFrame[] = new Array<TExoContextFrame>(calls);
    const twinChains: TExoContextFrame[] = new Array<TExoContextFrame>(calls);
    const flats: Array<ReadonlyMap<TExoContextToken<unknown>, unknown>> = new Array(calls);
    const protoFrames: TExoBenchProtoFrame[] = new Array<TExoBenchProtoFrame>(calls);
    const holders: TExoBenchHolder[] = new Array<TExoBenchHolder>(calls);
    for (let i = 0; i < calls; i++) {
        const n = i % INSTANCES;
        chains[i] = chainPool[n];
        twinChains[i] = twinPool[n];
        flats[i] = flatPool[n];
        protoFrames[i] = protoPool[n];
        holders[i] = holderPool[n];
    }

    return {
        chains,
        twinChains,
        flats,
        protoFrames,
        holders,
        key: target === -1 ? missToken : tokens[target],
        protoKey: target === -1 ? missProto : protoTokens[target],
    };
}
