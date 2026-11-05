import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineEffect } from './types/TExoMachineEffect';

export function withExoEffects<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    declare: (
        effect: (
            start: (enode: TWiring & { state: TState }) => (() => void) | null
        ) => TExoMachineEffect<TWiring>
    ) => void
): TMachine;
export function withExoEffects<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>,
    TNames extends string
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    starts: {
        readonly [K in TNames]: (enode: TWiring & { state: TState }) => (() => void) | null;
    }
): TMachine & {
    readonly effects: TMachine['effects'] & {
        readonly [K in TNames]: TExoMachineEffect<TWiring>;
    };
};
export function withExoEffects<TWiring>(
    machine: TExoMachine<TWiring>,
    declare:
        | ((
              effect: (start: (enode: TWiring) => (() => void) | null) => TExoMachineEffect<TWiring>
          ) => void)
        | Readonly<Record<string, (enode: TWiring) => (() => void) | null>>
): TExoMachine<TWiring> {
    const effects: TExoMachineEffect<TWiring>[] = Object.assign([], machine.effects);
    const effectsByName = effects as unknown as Record<string, TExoMachineEffect<TWiring>>;
    const push = (start: (enode: TWiring) => (() => void) | null): TExoMachineEffect<TWiring> => {
        const handle: TExoMachineEffect<TWiring> = { at: effects.length, start };
        effects.push(handle);
        return handle;
    };
    if (typeof declare === 'function') {
        declare(push);
    } else {
        for (const name in declare) {
            if (name in effects || /^\d+$/.test(name)) {
                throw new Error(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `withExoEffects: '${name}' is already taken on this machine's effects array, or is an index.`
                        : `EXO0112 "${name}"`
                );
            }
            effectsByName[name] = push(declare[name]);
        }
    }
    return { ...machine, forms: [], effects };
}
