import { harvestExoSchema } from '../../schema/factories/harvestExoSchema';
import type { TExoEventOf } from '../types/TExoEventOf';
import type { TExoEventPort } from '../../schema/ports/types/TExoEventPort';
import type { TExoCursorDeclaration } from '../../schema/types/TExoCursorDeclaration';
import type { TExoMachineBuilder } from '../types/TExoMachineBuilder';
import type { TExoMachine } from '../types/TExoMachine';
import type { TExoMachineEffect } from '../types/TExoMachineEffect';
import type { TExoMachineHandler } from '../types/TExoMachineHandler';
import type { TExoMachineStateHandle } from '../types/TExoMachineStateHandle';
import type { TExoMachineNode } from '../types/TExoMachineNode';
import type { TExoTransitionOverrides } from '../types/TExoTransitionOverrides';

const HERE = 'createExoMachineBuilder';

export function createExoMachineBuilder<
    TWiring extends TExoMachineNode = TExoMachineNode,
    TParams = unknown,
    TState = unknown
>(schema: TExoCursorDeclaration<unknown>): TExoMachineBuilder<TWiring, TParams, TState> {
    harvestExoSchema(schema);
    let createInitialState: ((enode: TWiring, index: number, params: unknown) => unknown) | null =
        null;
    let wire: ((enode: TWiring, params: unknown) => void) | null = null;
    const transitions: unknown[] = [];
    const effects: TExoMachineEffect<TWiring>[] = [];
    const handlerPorts: TExoEventPort[] = [];
    const handlers: ((enode: TWiring, event: TExoEventOf<TWiring>) => void)[] = [];
    let compiled: TExoMachine<TWiring> | null = null;

    const refuse = (what: string): never => {
        throw new Error(what);
    };

    const sealed = (what: string): void => {
        if (compiled !== null) {
            refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${HERE}: ${what} was declared after done(); a machine is closed once ` +
                          'it has compiled.'
                    : 'EXO0025'
            );
        }
    };

    const builder = {
        schema,

        createInitialState: <TValue>(
            make: (enode: TWiring, index: number, params: unknown) => TValue
        ): TExoMachineStateHandle<TValue> => {
            sealed('an initial state');
            // THE ONE PLACE THE SHARED-OBJECT BUG CAN BE CAUGHT: a value handed here would be ONE object
            // shared by every instance of the component, each seeing every other's writes.
            if (typeof make !== 'function') {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${HERE}: createInitialState() was handed a value, not a function`
                        : 'EXO0026'
                );
            }
            if (createInitialState !== null) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${HERE}: createInitialState() was called twice; unmanaged state is ONE ` +
                              'value, and a machine that wants several holds one object — which is ' +
                              "what a wire's closure is. Rows and numbers belong to managed state."
                        : 'EXO0086'
                );
            }
            createInitialState = make as (
                enode: TWiring,
                index: number,
                params: unknown
            ) => unknown;
            return {};
        },

        effect: (start: (c: TWiring) => (() => void) | null): TExoMachineEffect<TWiring> => {
            sealed('an effect');
            const handle: TExoMachineEffect<TWiring> = {
                at: effects.length,
                start: start,
            };
            effects.push(handle);
            return handle;
        },

        on: (
            port: TExoEventPort,
            handler: (enode: TWiring, event: TExoEventOf<TWiring>) => void
        ): void => {
            sealed('a handler');
            handlerPorts.push(port);
            handlers.push(handler);
        },

        wire: (apply: (enode: TWiring, params: unknown) => void): void => {
            sealed('a wire');
            if (wire !== null) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${HERE}: wire() was called twice; a machine has one wire.`
                        : 'EXO0101'
                );
            }
            wire = apply;
        },

        transition: (<TFirst, TSecond>(
            apply: (enode: TWiring, first: TFirst, second: TSecond) => void
        ): ((enode: TWiring, first: TFirst, second: TSecond) => void) => {
            sealed('a transition');
            const at = transitions.length;
            const run = (enode: TWiring, first: TFirst, second: TSecond): void => {
                const overrides = enode.transitionOverrides;
                if (overrides === null) {
                    apply(enode, first, second);
                    return;
                }
                const alternative = overrides[at] as typeof apply | undefined;
                if (alternative === undefined) apply(enode, first, second);
                else alternative(enode, first, second);
            };
            transitions.push(run);
            return run;
        }) as TExoMachineBuilder<TWiring>['transition'],

        overrides: (
            pairs: readonly (readonly [unknown, (...args: never[]) => void])[]
        ): TExoTransitionOverrides => {
            const table: (((...args: never[]) => void) | undefined)[] = new Array(
                transitions.length
            ).fill(undefined);
            for (let i = 0; i < pairs.length; i++) {
                const at = transitions.indexOf(pairs[i][0]);
                if (at === -1) {
                    refuse(
                        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                            ? `${HERE}: overrides() was handed a function that is not a transition of this machine.`
                            : 'EXO0102'
                    );
                }
                table[at] = pairs[i][1];
            }
            return table;
        },

        done: (): TExoMachine<TWiring> => {
            if (compiled !== null) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${HERE}: done() was called twice; a machine compiles once.`
                        : 'EXO0027'
                );
            }
            const routed: TExoMachineHandler[] = [];
            for (let at = 0; at < handlers.length; at++) {
                const run = handlers[at];
                routed.push({
                    port: handlerPorts[at],
                    run: (event: unknown, enode?: unknown): void => {
                        run(enode as TWiring, event as TExoEventOf<TWiring>);
                    },
                });
            }

            const machine: TExoMachine<TWiring> = {
                declaration: schema,
                forms: [],
                createInitialState,
                wire: wire === null ? undefined : wire,
                effects,
                handlers: routed,
            };
            compiled = machine;
            return machine;
        },
    };
    return builder as unknown as TExoMachineBuilder<TWiring, TParams, TState>;
}
