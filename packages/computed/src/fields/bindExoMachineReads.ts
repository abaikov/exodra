import type { TExoMachineField } from './types/TExoMachineField';

type TExoStated = { readonly managedState: unknown[] };

/**
 * THE ARITIES ARE SPELLED OUT rather than looped: a loop filling an array and calling `apply` would
 * allocate on the one path this design keeps to two array loads and a call. Five or more reuses one
 * buffer per declaration — safe because the VALUES are handed to the function and the ARRAY is not.
 *
 * WHICH LADDER A DERIVATION GETS IS DECIDED ONCE, by `(r0 | r1 | …) >= 0`: a row is `0..30`, so one
 * `-1` makes the whole list take the closure ladder. NOTHING HERE HAS BEEN MEASURED — the claim is
 * a count of operations, and whether V8 was already inlining the call is what a count cannot say.
 */
export function bindExoMachineReads<TState>(
    reads: readonly TExoMachineField<TState, unknown>[],
    run: (...values: never[]) => unknown
): (enode: TState) => unknown {
    const call = run as unknown as (...values: unknown[]) => unknown;
    const count = reads.length;
    if (count === 0) return (): unknown => call();

    const r0 = reads[0].row;
    if (count === 1) {
        if (r0 >= 0) {
            return (s): unknown => call((s as unknown as TExoStated).managedState[r0]);
        }
        const a = reads[0].read;
        return (s): unknown => call(a(s));
    }

    const r1 = reads[1].row;
    if (count === 2) {
        if ((r0 | r1) >= 0) {
            return (s): unknown => {
                const v = (s as unknown as TExoStated).managedState;
                return call(v[r0], v[r1]);
            };
        }
        const a = reads[0].read;
        const b = reads[1].read;
        return (s): unknown => call(a(s), b(s));
    }

    const r2 = reads[2].row;
    if (count === 3) {
        if ((r0 | r1 | r2) >= 0) {
            return (s): unknown => {
                const v = (s as unknown as TExoStated).managedState;
                return call(v[r0], v[r1], v[r2]);
            };
        }
        const a = reads[0].read;
        const b = reads[1].read;
        const c = reads[2].read;
        return (s): unknown => call(a(s), b(s), c(s));
    }

    const r3 = reads[3].row;
    if (count === 4) {
        if ((r0 | r1 | r2 | r3) >= 0) {
            return (s): unknown => {
                const v = (s as unknown as TExoStated).managedState;
                return call(v[r0], v[r1], v[r2], v[r3]);
            };
        }
        const a = reads[0].read;
        const b = reads[1].read;
        const c = reads[2].read;
        const d = reads[3].read;
        return (s): unknown => call(a(s), b(s), c(s), d(s));
    }

    let together = r0 | r1 | r2 | r3;
    for (let i = 4; i < count; i++) together |= reads[i].row;
    const args = new Array<unknown>(count);
    if (together >= 0) {
        const rows = new Int32Array(count);
        for (let i = 0; i < count; i++) rows[i] = reads[i].row;
        return (s): unknown => {
            const v = (s as unknown as TExoStated).managedState;
            for (let i = 0; i < count; i++) args[i] = v[rows[i]];
            return call.apply(null, args);
        };
    }
    const readers: ((enode: TState) => unknown)[] = new Array<(enode: TState) => unknown>(count);
    for (let i = 0; i < count; i++) readers[i] = reads[i].read;
    return (s): unknown => {
        for (let i = 0; i < count; i++) args[i] = readers[i](s);
        return call.apply(null, args);
    };
}
