import { commitExoMachine } from '../../src/machine/commitExoMachine';
import { fillExoMachineDerivations } from '../../src/fields/fillExoMachineDerivations';
import type { TExoBenchVariant } from '@exodra/bench-harness';
import type { TExoCommitScene } from './types/TExoCommitScene';

// EVERY LOOP STARTS FROM THE SAME PLACE: k field values have arrived, and the machine has to be
// settled. What differs is what each design does about it — mark bits and walk them, recompute
// everything, run a per-field chain at the write, or, in the floor, nothing at all because the
// hand-written program already knows which lines to run.

function driveShipped(scene: TExoCommitScene): number {
    const program = scene.program;
    const enode = scene.node;
    const state = enode.managedState;
    const marks = program.fieldMarks;
    const at = program.pendingRow;
    const written = scene.written;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        const v = stream[i];
        for (let w = 0; w < written.length; w++) {
            const f = written[w];
            state[f] = v + f;
            state[at] = (state[at] as number) | marks[f];
        }
        commitExoMachine(program, enode);
        acc += enode.ports[2] as number;
    }
    return acc;
}

function driveTwin(scene: TExoCommitScene): number {
    const program = scene.twinProgram;
    const enode = scene.twinNode;
    const state = enode.managedState;
    const marks = program.fieldMarks;
    const at = program.pendingRow;
    const written = scene.written;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        const v = stream[i];
        for (let w = 0; w < written.length; w++) {
            const f = written[w];
            state[f] = v + f;
            state[at] = (state[at] as number) | marks[f];
        }
        commitExoMachine(program, enode);
        acc += enode.ports[2] as number;
    }
    return acc;
}

/**
 * NO PENDING WORD AT ALL: run every derivation, in order, every time. It is the SHIPPED
 * `fillExoMachineDerivations`, which is what a mount does, used here as the design a machine would
 * have if nobody had built a mask — and the distance to `shipped` is what the mask is worth.
 */
function driveDense(scene: TExoCommitScene): number {
    const program = scene.denseProgram;
    const enode = scene.denseNode;
    const state = enode.managedState;
    const written = scene.written;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        const v = stream[i];
        for (let w = 0; w < written.length; w++) state[written[w]] = v + written[w];
        fillExoMachineDerivations(program, enode);
        acc += enode.ports[2] as number;
    }
    return acc;
}

/**
 * THE WAKE CHAINS, whose own header in `chainExoMachineWakes.ts` says AN EXPERIMENT, AND
 * UNMEASURED. There is no commit here and no bit walk: writing a field runs the closure compiled
 * for that field, which calls the derivations it reaches in slot order. What it cannot do is
 * coalesce — two writes reaching one derivation run it twice, which is why a `hold` parks this
 * table and takes the walk instead.
 */
function driveChain(scene: TExoCommitScene): number {
    const enode = scene.chainNode;
    const state = enode.managedState;
    const wakes = scene.wakes;
    const written = scene.written;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        const v = stream[i];
        for (let w = 0; w < written.length; w++) {
            const f = written[w];
            state[f] = v + f;
            const wake = wakes[f];
            if (wake !== null) wake(enode);
        }
        acc += enode.ports[2] as number;
    }
    return acc;
}

// THE NATIVE FLOORS. Six named fields on a plain object and the dependent lines written out in the
// order the commit runs them — no bits, no arrays of closures, no `set`. A hand-written program
// knows at the call site which values went stale, which is the knowledge the pending word rebuilds
// at run time.
function floorOneField(scene: TExoCommitScene): number {
    const s = scene.floorState;
    const out = scene.floorPorts;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        s.taxRate = stream[i] + 3;
        out[1] = s.subtotal * s.taxRate;
        out[2] = s.subtotal - s.discount + s.subtotal * s.taxRate;
        acc += out[2];
    }
    return acc;
}

function floorChained(scene: TExoCommitScene): number {
    const s = scene.floorState;
    const out = scene.floorPorts;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        s.quantity = stream[i];
        s.subtotal = s.quantity * s.unitPrice;
        out[0] = s.subtotal - s.discount;
        out[1] = s.subtotal * s.taxRate;
        out[2] = s.subtotal - s.discount + s.subtotal * s.taxRate;
        out[3] = s.currency + s.quantity;
        acc += out[2];
    }
    return acc;
}

function floorThreeFields(scene: TExoCommitScene): number {
    const s = scene.floorState;
    const out = scene.floorPorts;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        const v = stream[i];
        s.discount = v + 2;
        s.taxRate = v + 3;
        s.currency = v + 4;
        out[0] = s.subtotal - s.discount;
        out[1] = s.subtotal * s.taxRate;
        out[2] = s.subtotal - s.discount + s.subtotal * s.taxRate;
        out[3] = s.currency + s.quantity;
        out[4] = s.unitPrice + s.currency;
        acc += out[2];
    }
    return acc;
}

function floorAllFields(scene: TExoCommitScene): number {
    const s = scene.floorState;
    const out = scene.floorPorts;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) {
        const v = stream[i];
        s.quantity = v;
        s.unitPrice = v + 1;
        s.discount = v + 2;
        s.taxRate = v + 3;
        s.currency = v + 4;
        s.subtotal = s.quantity * s.unitPrice;
        out[0] = s.subtotal - s.discount;
        out[1] = s.subtotal * s.taxRate;
        out[2] = s.subtotal - s.discount + s.subtotal * s.taxRate;
        out[3] = s.currency + s.quantity;
        out[4] = s.unitPrice + s.currency;
        acc += out[2];
    }
    return acc;
}

// A transition that wrote no field leaves a hand-written program with NOTHING TO DO, so this is an
// empty loop and the ratio beside it is a ratio against one. Read that row as an absolute: it is
// what `commitExoMachine`'s one load and comparison cost when there is no work behind them.
function floorNothing(scene: TExoCommitScene): number {
    const out = scene.floorPorts;
    const stream = scene.stream;
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += out[2];
    return acc;
}

function driveFloor(scene: TExoCommitScene): number {
    switch (scene.name) {
        case 'one·field':
            return floorOneField(scene);
        case 'chained':
            return floorChained(scene);
        case 'three·fields':
            return floorThreeFields(scene);
        case 'all·fields':
            return floorAllFields(scene);
        default:
            return floorNothing(scene);
    }
}

export const EXO_MACHINE_COMMIT_VARIANTS: readonly TExoBenchVariant<TExoCommitScene>[] = [
    { name: 'shipped', drive: driveShipped },
    { name: 'shipped·twin', drive: driveTwin },
    { name: 'dense·fill', drive: driveDense },
    { name: 'chain·wakes', drive: driveChain },
    { name: 'floor·straight', drive: driveFloor },
];
