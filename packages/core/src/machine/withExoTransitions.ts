import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineNode } from './types/TExoMachineNode';
import type { TExoMachineTransitions } from './types/TExoMachineTransitions';
import type { TExoTransitionArgs } from './types/TExoTransitionArgs';
import type { TExoTransitionOverrides } from './types/TExoTransitionOverrides';

type TExoTransitionRun = (enode: TExoMachineNode, first: unknown, second: unknown) => void;

export function withExoTransitions<
    TWiring,
    TPorts,
    TParams,
    TState,
    TData extends Record<string, TExoTransitionArgs>,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    transitions: {
        readonly [K in keyof TData]: (
            enode: TWiring & { state: TState },
            ...data: TData[K]
        ) => void;
    }
): TMachine & {
    readonly transitions: TExoMachineTransitions<TWiring, TData>;
    overrides(replacements: {
        readonly [K in keyof TData]?: (enode: TWiring, ...data: TData[K]) => void;
    }): TExoTransitionOverrides;
} {
    const kept = (machine as { readonly transitions?: Record<string, TExoTransitionRun> })
        .transitions;
    const runs: Record<string, TExoTransitionRun> = kept === undefined ? {} : { ...kept };
    const names = Object.keys(runs);
    const declared = Object.keys(transitions);
    for (let i = 0; i < declared.length; i++) {
        const name = declared[i];
        const apply = transitions[name] as unknown as TExoTransitionRun;
        const at = names.length;
        names.push(name);
        runs[name] = (enode, first, second): void => {
            const overrides = enode.transitionOverrides;
            if (overrides === null) {
                apply(enode, first, second);
                return;
            }
            const alternative = overrides[at] as TExoTransitionRun | undefined;
            if (alternative === undefined) apply(enode, first, second);
            else alternative(enode, first, second);
        };
    }
    const overrides = (
        replacements: Readonly<Record<string, ((...args: never[]) => void) | undefined>>
    ): TExoTransitionOverrides => {
        const table: (((...args: never[]) => void) | undefined)[] = new Array(names.length).fill(
            undefined
        );
        for (const name in replacements) {
            const at = names.indexOf(name);
            if (at === -1) {
                throw new Error(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `overrides(): '${name}' is not a transition of this machine.`
                        : 'EXO0102'
                );
            }
            table[at] = replacements[name];
        }
        return table;
    };
    return {
        ...machine,
        forms: [],
        transitions: Object.freeze(runs),
        overrides,
    } as unknown as TMachine & {
        readonly transitions: TExoMachineTransitions<TWiring, TData>;
        overrides(replacements: {
            readonly [K in keyof TData]?: (enode: TWiring, ...data: TData[K]) => void;
        }): TExoTransitionOverrides;
    };
}
