import { EXO_NO_STATE } from '@exodra/core';
import { seatExoManagedRows } from '../wiring/seatExoManagedRows';
import { EXO_MOUNTED } from '../lifecycle/constants/EXO_MOUNTED';
import { exoMachineSettle } from '../transitions/exoMachineSettle';
import { exoTransition } from '../transitions/exoTransition';
import { chainExoMachineWakes } from '../machine/chainExoMachineWakes';
import { compileExoMachine } from '../machine/compileExoMachine';
import { exoFieldBit } from '../fields/exoFieldBit';
import { fillExoMachineDerivations } from '../fields/fillExoMachineDerivations';
import type { TExoLive, TExoMachine, TExoMachineEffect } from '@exodra/core';
import type { TExoComputedBuilder } from './types/TExoComputedBuilder';
import type { TExoComputedMachine } from './types/TExoComputedMachine';
import type { TExoComputedLive } from './types/TExoComputedLive';
import type { TExoComputedSettleCell } from './types/TExoComputedSettleCell';
import type { TExoComputedMachineNode } from './types/TExoComputedMachineNode';
import type { TExoMachineDerivation } from '../machine/types/TExoMachineDerivation';
import type { TExoMachineBody } from '../machine/types/TExoMachineBody';
import type { TExoMachineFieldHandle } from '../fields/types/TExoMachineFieldHandle';
import type { TExoMachineProgram } from '../machine/types/TExoMachineProgram';
import type { TExoMachineTarget } from '../machine/types/TExoMachineTarget';
import type { TExoMachineWake } from '../machine/types/TExoMachineWake';

const HERE = 'withExoComputedMachine';

/**
 * TWO ENGINE EFFECTS, AND THE ORDER IS THE WHOLE OF THE ARRANGEMENT:
 *
 *  · THE FIRST, registered before the author declares anything, is the INITIAL FILL. Its DISPOSER is
 *    what says `mounted` false — first registered means last disposed.
 *  · THE LAST, registered once the declaration returns, installs the wake chains. It must not happen while the
 *    author's effects are establishing, or a `set` fired inside a `start` would re-run derivations
 *    the fill has just run and write them through a path carrying no fill record.
 */
export function withExoComputedMachine<
    TWiring extends TExoComputedMachineNode,
    TPorts,
    TParams,
    TState,
    TTransitions extends object | void
>(
    machine: TExoMachine<TWiring, TPorts, TParams, TState>,
    declare: (b: TExoComputedBuilder<TWiring & { state: TState }>) => TTransitions
): TExoComputedMachine<TWiring> &
    TExoMachine<TWiring, TPorts, TParams, TState> & { readonly transitions: TTransitions } {
    type TInstance = TWiring;
    type TWake = TExoMachineWake<TInstance>;

    const addressBase = machine.declaration.portList.length;
    const effects: TExoMachineEffect<TInstance>[] = [];
    const effect = (start: (c: TInstance) => (() => void) | null): TExoMachineEffect<TInstance> => {
        if (sealed) {
            refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? 'an effect was declared after the declaration returned'
                    : ''
            );
        }
        const handle: TExoMachineEffect<TInstance> = { at: effects.length, start };
        effects.push(handle);
        return handle;
    };

    const managedSeeds: unknown[] = [];
    const settleCells: TExoComputedSettleCell<TInstance>[] = [];
    let sealed = false;
    const reserveManagedRow = (seed: unknown): number => {
        if (sealed) {
            refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? 'a field was declared after the declaration returned'
                    : ''
            );
        }
        const row = managedSeeds.length;
        managedSeeds.push(seed);
        return row;
    };

    // THE TWO ROWS OF THE SYSTEM ITSELF, taken before any field so every closure below can close over
    // a number rather than reach for one.
    const pendingRow = reserveManagedRow(0);
    const wakesRow = reserveManagedRow(null);

    const marks: number[] = [];
    const rows: number[] = [];
    const derivations: TExoMachineDerivation<TInstance>[] = [];
    const bodies: TExoMachineBody<TInstance>[] = [];
    let mountedField: TExoMachineFieldHandle<TWiring, boolean> | null = null;
    let program: TExoMachineProgram<TInstance> | null = null;
    let wakes: readonly (TWake | null)[] | null = null;
    let setMounted: ((enode: TInstance, on: boolean) => void) | null = null;

    const refuse = (what: string): never => {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${HERE}: ${what}`
                : 'EXO0077'
        );
    };

    effect((c: TInstance): (() => void) | null => {
        const compiled = program as TExoMachineProgram<TInstance>;
        fillExoMachineDerivations(compiled, c);
        const live = setMounted;
        if (live === null) return null;
        // `undefined` IS A BACKEND THAT KEEPS NO LIFECYCLE. `null` is one that does and has nothing in
        // the slot yet, which is every instance until this line.
        if (c.live !== undefined) {
            const held: TExoComputedLive<TWiring> = {
                setMounted: (of: TExoLive, on: boolean): void => {
                    live((of as TExoComputedLive<TWiring>).instance, on);
                },
                instance: c,
            };
            c.live = held;
        }
        return (): void => {
            live(c, false);
        };
    });

    const declareField = <TValue>(seed: unknown): TExoMachineFieldHandle<TWiring, TValue> => {
        const at = marks.length;
        const bit = exoFieldBit(at);
        const row = reserveManagedRow(seed);
        marks.push(0);
        rows.push(row);
        /**
         * SOUND BY CONSTRUCTION: the only things that write this slot are this handle's own `set`,
         * this field's seed, and a derivation whose declared address is this field.
         */
        const read = (enode: TInstance): TValue => enode.managedState[row] as TValue;
        return {
            address: addressBase + at,
            bit: bit,
            row: row,
            read: read,
            write: (enode: TInstance, value: unknown): void => {
                enode.managedState[row] = value;
            },
            get: read,
            /**
             * THE STORE AND THE WAKE IN ONE CALL, in two spellings with one test between them: the
             * CHAIN once the instance is past its wire, and the MARK otherwise — during a seed,
             * during the initial fill, and for the length of a `hold`, which parks the chain slot
             * precisely so that this line marks.
             */
            set: (enode: TInstance, value: TValue): void => {
                const values = enode.managedState;
                values[row] = value;
                const table = values[wakesRow] as readonly (TWake | null)[] | null;
                if (table !== null) {
                    const chain = table[at];
                    if (chain !== null) {
                        chain(enode);
                        return;
                    }
                }
                values[pendingRow] = (values[pendingRow] as number) | marks[at];
            },
        };
    };

    const labelOf = (port: TExoMachineTarget<TInstance>): string =>
        'kind' in port
            ? `port ${port.name === null ? port.index : port.name}`
            : (port as unknown) === (mountedField as unknown)
            ? EXO_MOUNTED
            : `field ${port.address}`;

    const builder = {
        field: <TValue>(seed: unknown): TExoMachineFieldHandle<TWiring, TValue> =>
            declareField<TValue>(seed),

        mounted: (): TExoMachineFieldHandle<TWiring, boolean> => {
            if (mountedField !== null) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${EXO_MOUNTED}() was declared twice; it is one field.`
                        : ''
                );
            }
            const handle = declareField<boolean>(false);
            mountedField = handle;
            return handle;
        },

        derive: (
            port: TExoMachineTarget<TInstance>,
            from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
            by: (...values: never[]) => unknown
        ): void => {
            derivations.push({
                label: labelOf(port),
                reads: from,
                into: port,
                compute: by,
            });
        },

        fill: (
            from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
            run: (enode: TInstance) => void
        ): void => {
            effect((enode: TInstance): null => {
                run(enode);
                return null;
            });
            bodies.push({
                label: `fill ${bodies.length}`,
                reads: from,
                start: run as unknown as (instance: never) => void,
            });
        },

        /**
         * A MANAGED FIELD MUST RECOMPUTE, so a transition over one is its body PLUS the settle —
         * which does not exist until the declaration returns and the program is compiled, hence the cell.
         */
        transition: <TFirst, TSecond>(
            apply: (enode: TInstance, first: TFirst, second: TSecond) => void
        ): ((enode: TInstance, first: TFirst, second: TSecond) => void) => {
            if (sealed) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? 'a transition was declared after the declaration returned'
                        : ''
                );
            }
            const cell: TExoComputedSettleCell<TInstance> = { settle: null };
            settleCells.push(cell);
            return (enode, first, second): void => {
                apply(enode, first, second);
                const settle = cell.settle;
                if (settle !== null) settle(enode);
            };
        },

        effectOn: (
            from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
            start: (c: TInstance) => (() => void) | null
        ): void => {
            const handle = effect(start);
            bodies.push({
                label: `effect ${bodies.length}`,
                reads: from,
                start: ((c: TInstance): void => {
                    c.restartEffect(handle);
                }) as unknown as (instance: never) => void,
            });
        },

        effect,
    };

    if (machine.effects.length !== 0) {
        refuse(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'this machine already has effects; declare them with b.effect inside the ' +
                      'computed declaration, so the initial fill runs before them and the wake ' +
                      'chains are installed after them'
                : ''
        );
    }
    const transitions = declare(
        builder as unknown as TExoComputedBuilder<TWiring & { state: TState }>
    );
    const declaredMounted = mountedField as TExoMachineFieldHandle<TWiring, boolean> | null;
    {
        const fields = marks.length;
        const compiled = compileExoMachine<TInstance>({
            fields: fields,
            pendingRow: pendingRow,
            wakesRow: wakesRow,
            derivations: derivations,
            bodies: bodies,
        });
        program = compiled;

        /**
         * A FIELD WHOSE MARK IS ZERO IS READ BY NOTHING THIS COMPONENT DOES, so every scrap
         * of machinery it carries can never be used — `keep` is where such a value lives.
         * THIS IS THE MOMENT AND THERE IS NO OTHER: a mark is complete only once every
         * declaration has been made, and none may follow the declaration's return.
         */
        const declares = derivations.length !== 0 || bodies.length !== 0;
        for (let at = 0; at < fields; at++) {
            const mark = compiled.fieldMarks[at];
            if (declares && mark === 0) {
                const name =
                    declaredMounted !== null && declaredMounted.row === rows[at]
                        ? `${EXO_MOUNTED}()`
                        : `field ${addressBase + at}`;
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${name} is read by none of this component's ${derivations.length} ` +
                              `derivation(s) and ${bodies.length} fill(s)/effect(s)`
                        : ''
                );
            }
            marks[at] = mark;
        }

        const settle =
            compiled.computes.length === 0 && compiled.bodyMask === 0
                ? null
                : exoMachineSettle<TInstance>(compiled);
        for (let at = 0; at < settleCells.length; at++) settleCells[at].settle = settle;

        if (declaredMounted !== null) {
            const live = declaredMounted;
            setMounted = exoTransition<TInstance, boolean>(compiled, (enode, on): void => {
                live.set(enode, on);
            });
        }

        if (declares) {
            wakes = chainExoMachineWakes<TInstance>(compiled);
            effect((c: TInstance): null => {
                c.managedState[wakesRow] = wakes;
                return null;
            });
        }

        sealed = true;
        const authorCreatesInitialState = machine.createInitialState as
            | ((enode: TInstance, params: unknown) => unknown)
            | null;
        return {
            ...machine,
            forms: [],
            effects,
            createInitialState: (enode: TInstance, params: unknown): unknown => {
                seatExoManagedRows(enode, managedSeeds);
                return authorCreatesInitialState === null
                    ? EXO_NO_STATE
                    : authorCreatesInitialState(enode, params);
            },
            program: compiled,
            transitions,
        } as unknown as TExoComputedMachine<TWiring> &
            TExoMachine<TWiring, TPorts, TParams, TState> & { readonly transitions: TTransitions };
    }
}
