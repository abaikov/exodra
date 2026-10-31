import { bindExoMachineReads } from '../fields/bindExoMachineReads';
import { compileExoMachine } from '../machine/compileExoMachine';
import { exoBoundTransition } from '../transitions/exoBoundTransition';
import { exoFieldBit } from '../fields/exoFieldBit';
import { exoMachineSettle } from '../transitions/exoMachineSettle';
import { fillExoMachineDerivations } from '../fields/fillExoMachineDerivations';
import { runExoMachineSlots } from '../machine/runExoMachineSlots';
import { seatExoManagedRows } from './seatExoManagedRows';
import type { TExoLive, TExoMachineEffect } from '@exodra/core';
import type { TExoComputedLive } from '../computed/types/TExoComputedLive';
import type { TExoComputedMachineNode } from '../computed/types/TExoComputedMachineNode';
import type { TExoMachineFieldHandle } from '../fields/types/TExoMachineFieldHandle';
import type { TExoMachineProgram } from '../machine/types/TExoMachineProgram';
import type { TExoMachineReads } from '../fields/types/TExoMachineReads';
import type { TExoMachineSettler } from '../transitions/types/TExoMachineSettler';
import type { TExoMachineTarget } from '../machine/types/TExoMachineTarget';
import type { TExoWiringSite } from './types/TExoWiringSite';

const HERE = 'exoWiring';

/** ROW ZERO OF EVERY WIRING BLOCK'S TABLE IS ITS PENDING WORD, so a field handle built before the
 * count is final still closes over a number. The fields follow it. */
const PENDING_ROW = 0;

const EXO_BLOCK_SEEDS: readonly unknown[] = [0];

const stubBody = (): void => {};

function sameExoReads(was: readonly unknown[], now: readonly unknown[]): boolean {
    if (was.length !== now.length) return false;
    for (let i = 0; i < was.length; i++) {
        if (was[i] !== now[i]) return false;
    }
    return true;
}

/**
 * ITS REFUSALS ARE ALL ABOUT DISAGREEMENT BETWEEN INSTANCES: the slots are compiled once, by the
 * FIRST instance, so a conditional declaration would be a slot the compiled tables have no row for.
 */
export class ExoWiringBlock<TWiring extends TExoComputedMachineNode>
    implements TExoMachineSettler<TWiring>
{
    instance: TWiring | null;
    settle: ((enode: TWiring) => void) | null;
    private readonly site: TExoWiringSite<TWiring>;
    private readonly enode: TWiring;
    private readonly computes: ((enode: TWiring) => unknown)[];
    private readonly starts: ((enode: TWiring) => void)[];
    private readonly effects: TExoMachineEffect<TWiring>[];
    private mountedAt: number;

    constructor(site: TExoWiringSite<TWiring>, enode: TWiring) {
        this.instance = null;
        this.settle = null;
        this.site = site;
        this.enode = enode;
        seatExoManagedRows(enode, EXO_BLOCK_SEEDS);
        this.computes = [];
        this.starts = [];
        this.effects = [];
        this.mountedAt = -1;
    }

    private refuse(what: string): never {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${HERE}: ${what}`
                : 'EXO0079'
        );
    }

    private sealed(what: string): void {
        if (this.instance !== null) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${what} was declared after done(); a wiring block is closed once it arms.`
                    : ''
            );
        }
    }

    field<TValue>(seed: TValue): TExoMachineFieldHandle<TWiring, TValue> {
        this.sealed('a field');
        const values = this.enode.managedState;
        const row = values.length;
        const at = row - 1;
        values.push(seed);
        const site = this.site;
        if (at < site.handles.length) {
            return site.handles[at] as unknown as TExoMachineFieldHandle<TWiring, TValue>;
        }
        if (site.program !== null) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `field ${at} was declared by this instance and not by the first one; every ` +
                          'instance of a component must declare the same fields in the same order.'
                    : ''
            );
        }
        const bit = exoFieldBit(at);
        const marks = site.marks;
        marks.push(0);
        const read = (enode: TWiring): TValue => enode.managedState[row] as TValue;
        const handle: TExoMachineFieldHandle<TWiring, TValue> = {
            address: at,
            bit: bit,
            row: row,
            read: read,
            write: (enode: TWiring, value: unknown): void => {
                enode.managedState[row] = value;
            },
            get: read,
            set: (enode: TWiring, value: TValue): void => {
                const values = enode.managedState;
                values[row] = value;
                values[PENDING_ROW] = (values[PENDING_ROW] as number) | marks[at];
            },
        };
        site.handles.push(handle as unknown as TExoMachineFieldHandle<TWiring, unknown>);
        return handle;
    }

    mounted(): TExoMachineFieldHandle<TWiring, boolean> {
        this.sealed('mounted');
        const site = this.site;
        const at = this.enode.managedState.length - 1;
        if (site.mountedRow !== -1 && site.mountedRow !== at) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `mounted() was declared at field ${at} and the first instance declared it at ` +
                          `field ${site.mountedRow}; it is one field and it must be declared in one place.`
                    : ''
            );
        }
        if (site.mountedRow === -1 && site.program !== null) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `mounted() was declared at field ${at} by this instance and by no earlier one; ` +
                          'the instances that skipped it can never report their placement.'
                    : ''
            );
        }
        const handle = this.field<boolean>(false);
        site.mountedRow = at;
        this.mountedAt = at;
        return handle;
    }

    derive<const TFrom extends readonly TExoMachineFieldHandle<TWiring, unknown>[]>(
        target: TExoMachineTarget<TWiring>,
        from: TFrom,
        by: (...values: TExoMachineReads<TWiring, TFrom>) => unknown
    ): void {
        this.sealed('a derivation');
        const site = this.site;
        const slot = this.computes.length;
        if (slot < site.derivations.length) {
            const was = site.derivations[slot];
            if (was.into !== target || !sameExoReads(was.reads, from)) {
                const which = was.into !== target ? 'a different address' : 'a different read list';
                this.refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `derivation ${slot} does not match the one the first instance declared at ` +
                              `that slot: ${which}`
                        : ''
                );
            }
        } else if (site.program !== null) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `derivation ${slot} was declared by this instance and not by the first one; there ` +
                          'is no compiled slot for it.'
                    : ''
            );
        } else {
            site.derivations.push({
                label: `derivation ${slot}`,
                reads: from,
                into: target,
                compute: stubBody,
            });
        }
        this.computes[slot] = bindExoMachineReads(
            site.derivations[slot].reads,
            by as unknown as (...values: never[]) => unknown
        );
    }

    fill(
        from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
        run: (c: TWiring) => void
    ): void {
        this.starts[this.record('fill', from, false)] = run;
    }

    /**
     * AN EFFECT OWNS ITS DISPOSER IN THE ENGINE'S ARRAY: what stands in this block's body table is
     * the RE-RUN, exactly as `m.effectOn` compiles to.
     */
    effect(
        from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
        start: (c: TWiring) => (() => void) | null
    ): void {
        const slot = this.record('effect', from, true);
        const handle: TExoMachineEffect<TWiring> = {
            at: this.effects.length,
            start: start,
        };
        this.effects.push(handle);
        this.starts[slot] = (enode: TWiring): void => {
            enode.restartEffect(handle);
        };
    }

    private record(
        what: string,
        from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
        owns: boolean
    ): number {
        this.sealed(`a ${what}`);
        const site = this.site;
        const slot = this.starts.length;
        if (slot < site.effects.length) {
            const was = site.effects[slot];
            if (!sameExoReads(was.reads, from) || site.owns[slot] !== owns) {
                const which =
                    site.owns[slot] !== owns ? 'a different kind' : 'a different read list';
                this.refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${what} ${slot} does not match the declaration the first instance made at ` +
                              `that slot: ${which}`
                        : ''
                );
            }
        } else if (site.program !== null) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${what} ${slot} was declared by this instance and not by the first one; there is ` +
                          'no compiled slot for it.'
                    : ''
            );
        } else {
            site.effects.push({
                label: `${what} ${slot}`,
                reads: from,
                start: stubBody as unknown as (instance: never) => void,
            });
            site.owns.push(owns);
        }
        return slot;
    }

    transition(apply: (c: TWiring) => void): () => void;
    transition<TFirst>(apply: (c: TWiring, first: TFirst) => void): (first: TFirst) => void;
    transition<TFirst, TSecond>(
        apply: (c: TWiring, first: TFirst, second: TSecond) => void
    ): (first: TFirst, second: TSecond) => void;
    transition<TFirst, TSecond>(
        apply: (c: TWiring, first: TFirst, second: TSecond) => void
    ): (first: TFirst, second: TSecond) => void {
        return exoBoundTransition<TWiring, TFirst, TSecond>(this, apply);
    }

    done(): void {
        if (this.instance !== null) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? 'done() was called twice; a wiring block arms once.'
                    : ''
            );
        }
        const site = this.site;
        const values = this.enode.managedState;
        const fields = values.length - 1;
        let shared = site.program;
        if (shared === null) {
            shared = compileExoMachine<TWiring>({
                fields: fields,
                pendingRow: PENDING_ROW,
                derivations: site.derivations,
                bodies: site.effects,
            });
            site.program = shared;
            const marks = site.marks;
            for (let at = 0; at < fields; at++) marks[at] = shared.fieldMarks[at];
        } else if (
            fields !== site.handles.length ||
            this.computes.length !== site.derivations.length ||
            this.starts.length !== site.effects.length
        ) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `this instance declared ${fields} fields, ${this.computes.length} derivations and ` +
                          `${this.starts.length} fills/effects where the first declared ` +
                          `${site.handles.length}, ${site.derivations.length} and ${site.effects.length}`
                    : ''
            );
        }
        if (this.mountedAt !== site.mountedRow) {
            this.refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? 'this instance did not declare mounted(), and the first instance declared it at ' +
                          `field ${site.mountedRow}`
                    : ''
            );
        }

        // IN `compileExoMachine`'S FIELD ORDER, so V8 gives this literal the map that function's own
        // literal has and every reader of a program stays monomorphic.
        const program: TExoMachineProgram<TWiring> = {
            fieldMarks: shared.fieldMarks,
            reads: shared.reads,
            computes: this.computes,
            ports: shared.ports,
            portIndexes: shared.portIndexes,
            stores: shared.stores,
            after: shared.after,
            labels: shared.labels,
            bodies: this.starts,
            bodyBase: shared.bodyBase,
            bodyMask: shared.bodyMask,
            pendingRow: PENDING_ROW,
            wakesRow: -1,
        };
        const settle = exoMachineSettle(program);
        const c = this.enode;
        const mountedRow = site.mountedRow;
        const setMounted =
            mountedRow === -1
                ? null
                : exoBoundTransition<TWiring, boolean>(this, (enode, on) => {
                      site.handles[mountedRow].set(enode, on);
                  });
        this.instance = c;
        this.settle = settle;

        if (setMounted !== null && c.live !== undefined) {
            const held: TExoComputedLive<TWiring> = {
                setMounted: (_of: TExoLive, on: boolean): void => {
                    setMounted(on);
                },
                instance: c,
            };
            c.live = held;
        }

        const owned = this.effects.length;
        if (owned !== 0) {
            c.effectStops = new Array<(() => void) | null>(owned).fill(null);
            c.onTeardown((): void => {
                c.stopEffects();
            });
        }
        fillExoMachineDerivations(program, c);
        if (program.bodyMask !== 0) {
            // THROUGH THE PENDING WORD AND NOT BY A PLAIN LOOP: a body that fires a transition re-enters,
            // and going through the word is what makes each slot run exactly once however deeply it nests.
            values[PENDING_ROW] = program.bodyMask;
            runExoMachineSlots(program, c);
        }
        if (setMounted !== null) {
            c.onTeardown((): void => {
                setMounted(false);
            });
        }
    }
}
