import { EXO_STORE_COMPILER } from './EXO_STORE_COMPILER';
import { EXO_MACHINE_LIMIT } from '../transitions/constants/EXO_MACHINE_LIMIT';
import { bindExoMachineReads } from '../fields/bindExoMachineReads';
import type { TExoPort } from '@exodra/core';
import type { TExoMachineBody } from './types/TExoMachineBody';
import type { TExoMachineField } from '../fields/types/TExoMachineField';
import type { TExoMachineProgram } from './types/TExoMachineProgram';
import type { TExoMachineDeclaration } from './types/TExoMachineDeclaration';

const HERE = 'compileExoMachine';

/**
 * EVERYTHING IS REFUSED HERE, at module load, because a flat description has nowhere to put a
 * run-time guard that would not be paid on every commit forever: the two ceilings, a field this
 * machine did not declare, a DERIVATION that reads nothing (a BODY that reads nothing is accepted),
 * a port still at `-1`, a store into a field with no writer, and a non-topological order.
 *
 * Derivations and bodies are numbered in ONE sequence, derivations first, which is what makes
 * "bodies last" fall out of a low-to-high walk.
 */
export function compileExoMachine<TState>(
    spec: TExoMachineDeclaration<TState>
): TExoMachineProgram<TState> {
    const fields = spec.fields;
    const declared = spec.derivations;
    const declaredEffects: readonly TExoMachineBody<TState>[] = spec.bodies ?? [];
    const refuse = (why: string): never => {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${HERE}: ${why}`
                : 'EXO0080'
        );
    };

    const count = declared.length;
    const effectCount = declaredEffects.length;
    const slots = count + effectCount;

    if (!Number.isInteger(fields) || fields < 0 || fields > EXO_MACHINE_LIMIT) {
        refuse(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${fields} enode fields; the ceiling is ${EXO_MACHINE_LIMIT}.`
                : ''
        );
    }
    if (slots > EXO_MACHINE_LIMIT) {
        refuse(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${count} derivations and ${effectCount} bodies share one pending word; ` +
                      `the ceiling is ${EXO_MACHINE_LIMIT}.`
                : ''
        );
    }

    const fieldMarks = new Int32Array(fields);
    const reads = new Int32Array(slots);
    const labels: string[] = new Array<string>(slots);
    const computes: ((enode: TState) => unknown)[] = new Array<(enode: TState) => unknown>(count);
    const ports: (TExoPort | null)[] = new Array<TExoPort | null>(count);
    const portIndexes = new Int32Array(count);
    const stores: (((enode: TState, value: unknown) => void) | null)[] = new Array<
        ((enode: TState, value: unknown) => void) | null
    >(count);
    const after = new Int32Array(count);
    const starts: ((enode: TState) => void)[] = new Array<(enode: TState) => void>(effectCount);

    const rowOf = (bit: number): number => 31 - Math.clz32(bit);

    const maskOf = (
        list: readonly TExoMachineField<TState, unknown>[],
        at: string,
        slotBit: number
    ): number => {
        let mask = 0;
        for (let k = 0; k < list.length; k++) {
            const row = rowOf(list[k].bit);
            if (row >= fields) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${at} reads field ${list[k].address}, past the ${fields} declared.`
                        : ''
                );
            }
            mask |= list[k].bit;
            fieldMarks[row] |= slotBit;
        }
        return mask;
    };

    for (let i = 0; i < count; i++) {
        const d = declared[i];
        const at = `derivation ${i} ("${d.label}")`;
        const target = d.into;
        const mask = maskOf(d.reads, at, 1 << i);

        if (mask === 0) {
            refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${at} reads no field, so nothing could wake it.`
                    : ''
            );
        }

        if ('kind' in target) {
            if (target.index < 0) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${at} names an unnumbered port; compile inside the wire factory.`
                        : ''
                );
            }
            ports[i] = target;
            portIndexes[i] = target.index;
            stores[i] = target.compileWith(EXO_STORE_COMPILER) as (typeof stores)[number];
        } else {
            if (rowOf(target.bit) >= fields) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${at} stores field ${target.address}, past the ${fields} declared.`
                        : ''
                );
            }
            if (target.write === null) {
                refuse(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `${at} stores into field ${target.address}, declared with no writer.`
                        : ''
                );
            }
            ports[i] = null;
            portIndexes[i] = -1;
            stores[i] = target.write;
        }

        reads[i] = mask;
        labels[i] = d.label;
        computes[i] = bindExoMachineReads(d.reads, d.compute);
    }

    // THE BODIES, NUMBERED ABOVE EVERY DERIVATION. This pass runs before the topological check,
    // which reads the finished field table.
    let effectMask = 0;
    for (let e = 0; e < effectCount; e++) {
        const declaration = declaredEffects[e];
        const slot = count + e;
        const bit = 1 << slot;
        effectMask |= bit;
        reads[slot] = maskOf(declaration.reads, `body ${e} ("${declaration.label}")`, bit);
        labels[slot] = declaration.label;
        starts[e] = declaration.start as unknown as (enode: TState) => void;
    }

    for (let i = 0; i < count; i++) {
        const target = declared[i].into;
        if ('kind' in target) continue;
        const woken = fieldMarks[rowOf(target.bit)];
        after[i] = woken;
        const early = (woken & ~(-1 << i)) | (woken & (1 << i));
        if (early !== 0) {
            const offenders: string[] = [];
            for (let j = 0; j <= i; j++) {
                if ((woken & (1 << j)) !== 0) offenders.push(`${j} ("${labels[j]}")`);
            }
            refuse(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `derivation ${i} ("${labels[i]}") stores field ${target.address}, read by ` +
                          `${offenders.join(', ')} declared at or before it: not topological.`
                    : ''
            );
        }
    }

    return {
        fieldMarks: fieldMarks,
        reads: reads,
        computes: computes,
        ports: ports,
        portIndexes: portIndexes,
        stores: stores,
        after: after,
        labels: labels,
        bodies: starts,
        bodyBase: count,
        bodyMask: effectMask,
        pendingRow: spec.pendingRow,
        wakesRow: spec.wakesRow ?? -1,
    };
}
