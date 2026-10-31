import type { TExoCommitNode } from '../computed/types/TExoCommitNode';
import type { TExoMachineProgram } from './types/TExoMachineProgram';
import type { TExoMachineWake } from './types/TExoMachineWake';

const chainTo = <TState extends TExoCommitNode>(
    compute: (enode: TState) => unknown,
    store: (enode: TState, value: unknown) => void
): TExoMachineWake<TState> => {
    return (enode: TState): void => {
        store(enode, compute(enode));
    };
};

const chainOf1 = <TState extends TExoCommitNode>(
    at: number,
    bits: number,
    a: TExoMachineWake<TState>
): TExoMachineWake<TState> => {
    return (enode: TState): void => {
        const values = enode.managedState;
        values[at] = (values[at] as number) | bits;
        a(enode);
    };
};

const chainOf2 = <TState extends TExoCommitNode>(
    at: number,
    bits: number,
    a: TExoMachineWake<TState>,
    b: TExoMachineWake<TState>
): TExoMachineWake<TState> => {
    return (enode: TState): void => {
        const values = enode.managedState;
        values[at] = (values[at] as number) | bits;
        a(enode);
        b(enode);
    };
};

const chainOf3 = <TState extends TExoCommitNode>(
    at: number,
    bits: number,
    a: TExoMachineWake<TState>,
    b: TExoMachineWake<TState>,
    d: TExoMachineWake<TState>
): TExoMachineWake<TState> => {
    return (enode: TState): void => {
        const values = enode.managedState;
        values[at] = (values[at] as number) | bits;
        a(enode);
        b(enode);
        d(enode);
    };
};

const chainOf4 = <TState extends TExoCommitNode>(
    at: number,
    bits: number,
    a: TExoMachineWake<TState>,
    b: TExoMachineWake<TState>,
    d: TExoMachineWake<TState>,
    e: TExoMachineWake<TState>
): TExoMachineWake<TState> => {
    return (enode: TState): void => {
        const values = enode.managedState;
        values[at] = (values[at] as number) | bits;
        a(enode);
        b(enode);
        d(enode);
        e(enode);
    };
};

const chainOfMany = <TState extends TExoCommitNode>(
    at: number,
    bits: number,
    units: readonly TExoMachineWake<TState>[]
): TExoMachineWake<TState> => {
    return (enode: TState): void => {
        const values = enode.managedState;
        values[at] = (values[at] as number) | bits;
        for (let i = 0; i < units.length; i++) units[i](enode);
    };
};

/**
 * AN EXPERIMENT, AND UNMEASURED. The commit's bit walk beside it is untouched and is still the path
 * a hold, a seed and the initial fill take — a hold PARKS this table precisely so several writes
 * coalesce into one commit, which a per-field chain cannot do by construction.
 */
export function chainExoMachineWakes<TState extends TExoCommitNode>(
    program: TExoMachineProgram<TState>
): (TExoMachineWake<TState> | null)[] {
    const at = program.pendingRow;
    const marks = program.fieldMarks;
    const effectMask = program.bodyMask;
    const computes = program.computes;
    const ports = program.ports;
    const stores = program.stores;
    const after = program.after;

    const units: TExoMachineWake<TState>[] = new Array<TExoMachineWake<TState>>(computes.length);
    for (let i = 0; i < computes.length; i++) {
        units[i] = chainTo<TState>(
            computes[i],
            stores[i] as (enode: TState, value: unknown) => void
        );
    }

    type TWakeOrNone = TExoMachineWake<TState> | null;
    const wakes: TWakeOrNone[] = new Array<TWakeOrNone>(marks.length);
    const ordered: TExoMachineWake<TState>[] = [];
    for (let row = 0; row < marks.length; row++) {
        const mark = marks[row];
        let pending = mark & ~effectMask;
        let bits = mark & effectMask;
        let reached = 0;
        while (pending !== 0) {
            const bit = pending & -pending;
            const i = 31 - Math.clz32(bit);
            pending ^= bit;
            reached |= bit;
            if (ports[i] === null) {
                const woken = after[i];
                pending |= woken & ~effectMask & ~reached;
                bits |= woken & effectMask;
            }
        }
        if (reached === 0) {
            wakes[row] = null;
            continue;
        }
        ordered.length = 0;
        let rest = reached;
        while (rest !== 0) {
            const bit = rest & -rest;
            rest ^= bit;
            ordered.push(units[31 - Math.clz32(bit)]);
        }
        const count = ordered.length;
        wakes[row] =
            count === 1
                ? chainOf1<TState>(at, bits, ordered[0])
                : count === 2
                ? chainOf2<TState>(at, bits, ordered[0], ordered[1])
                : count === 3
                ? chainOf3<TState>(at, bits, ordered[0], ordered[1], ordered[2])
                : count === 4
                ? chainOf4<TState>(at, bits, ordered[0], ordered[1], ordered[2], ordered[3])
                : // THE COPY IS THE POINT: `ordered` is reused for the next row.
                  chainOfMany<TState>(at, bits, ordered.slice());
    }
    return wakes;
}
