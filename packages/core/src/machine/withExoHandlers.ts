import type { TExoEventOf } from './types/TExoEventOf';
import type { TExoEventPort } from '../schema/ports/types/TExoEventPort';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineHandler } from './types/TExoMachineHandler';

export function withExoHandlers<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    declare: (
        on: <TEvent>(
            port: TExoEventPort<TEvent>,
            handler: (
                enode: TWiring & { state: TState },
                event: unknown extends TEvent ? TExoEventOf<TWiring> : TEvent
            ) => void
        ) => void
    ) => void
): TMachine {
    const handlers: TExoMachineHandler[] = machine.handlers.slice();
    declare((port, handler) => {
        handlers.push({
            port,
            run: (event: unknown, enode?: unknown): void => {
                (handler as (enode: unknown, event: unknown) => void)(enode, event);
            },
        });
    });
    return { ...machine, forms: [], handlers } as TMachine;
}
