import { EXO_PORT_TEXT } from '@exodra/core';
import type { TExoPort, TExoPortCompiler } from '@exodra/core';
import { chainExoMachineWakes } from '../../../src/machine/chainExoMachineWakes';
import { compileExoMachine } from '../../../src/machine/compileExoMachine';
import { exoFieldBit } from '../../../src/fields/exoFieldBit';
import { fillExoMachineDerivations } from '../../../src/fields/fillExoMachineDerivations';
import type { TExoMachineDerivation } from '../../../src/machine/types/TExoMachineDerivation';
import type { TExoMachineField } from '../../../src/fields/types/TExoMachineField';
import type { TExoMachineProgram } from '../../../src/machine/types/TExoMachineProgram';
import type {
    TExoCommitFloorState,
    TExoCommitNode,
    TExoCommitScene,
} from '../types/TExoCommitScene';

// SIX FIELDS, SIX DERIVATIONS, ONE OF THEM STORING A FIELD THE NEXT THREE READ. The stored one is
// what makes `commitExoMachine`'s `after` branch reachable, and a machine without one would let the
// bit walk look simpler than the walk a real machine takes.
//
// Fields are built in the shape `withExoComputedMachine.ts:94` builds them, WITH `row >= 0`:
// that is the form every machine an application declares actually has, and it is the form
// `bindExoMachineReads` gives the indexed ladder to rather than the closure ladder. A hand-declared
// field (`exoMachineField`, row -1) would measure a different reader.

const FIELDS = 6;
const PENDING_ROW = 6;
const STATE_ROWS = 7;
const PORTS = 5;

const QUANTITY = 0;
const UNIT_PRICE = 1;
const DISCOUNT = 2;
const TAX_RATE = 3;
const CURRENCY = 4;
const SUBTOTAL = 5;

function fieldOf(address: number): TExoMachineField<TExoCommitNode, unknown> {
    const row = address;
    return {
        address: address,
        bit: exoFieldBit(address),
        row: row,
        read: (enode: TExoCommitNode): unknown => enode.managedState[row],
        write: (enode: TExoCommitNode, value: unknown): void => {
            enode.managedState[row] = value;
        },
    };
}

const FIELD: readonly TExoMachineField<TExoCommitNode, unknown>[] = [
    fieldOf(QUANTITY),
    fieldOf(UNIT_PRICE),
    fieldOf(DISCOUNT),
    fieldOf(TAX_RATE),
    fieldOf(CURRENCY),
    fieldOf(SUBTOTAL),
];

function portOf(index: number): TExoPort {
    return {
        index: index,
        kind: EXO_PORT_TEXT,
        name: null,
        compileWith<TWriter>(cutter: TExoPortCompiler<TWriter>): TWriter {
            return cutter.text(this as never);
        },
    };
}

const PORT: readonly TExoPort[] = [portOf(0), portOf(1), portOf(2), portOf(3), portOf(4)];

// The compute functions are the same six expressions the floor holds, so a gap between the two is
// the WALK and never the arithmetic.
const DERIVATIONS: readonly TExoMachineDerivation<TExoCommitNode>[] = [
    {
        label: 'subtotal',
        reads: [FIELD[QUANTITY], FIELD[UNIT_PRICE]],
        into: FIELD[SUBTOTAL],
        compute: ((quantity: number, unitPrice: number): number =>
            quantity * unitPrice) as unknown as (...values: never[]) => unknown,
    },
    {
        label: 'discounted',
        reads: [FIELD[SUBTOTAL], FIELD[DISCOUNT]],
        into: PORT[0],
        compute: ((subtotal: number, discount: number): number =>
            subtotal - discount) as unknown as (...values: never[]) => unknown,
    },
    {
        label: 'tax',
        reads: [FIELD[SUBTOTAL], FIELD[TAX_RATE]],
        into: PORT[1],
        compute: ((subtotal: number, taxRate: number): number => subtotal * taxRate) as unknown as (
            ...values: never[]
        ) => unknown,
    },
    {
        label: 'total',
        reads: [FIELD[SUBTOTAL], FIELD[DISCOUNT], FIELD[TAX_RATE]],
        into: PORT[2],
        compute: ((subtotal: number, discount: number, taxRate: number): number =>
            subtotal - discount + subtotal * taxRate) as unknown as (...values: never[]) => unknown,
    },
    {
        label: 'label',
        reads: [FIELD[CURRENCY], FIELD[QUANTITY]],
        into: PORT[3],
        compute: ((currency: number, quantity: number): number =>
            currency + quantity) as unknown as (...values: never[]) => unknown,
    },
    {
        label: 'unit',
        reads: [FIELD[UNIT_PRICE], FIELD[CURRENCY]],
        into: PORT[4],
        compute: ((unitPrice: number, currency: number): number =>
            unitPrice + currency) as unknown as (...values: never[]) => unknown,
    },
];

// NO BODIES, and that is a statement about what this table covers: `exoMachineSettle` picks a
// settle function WITHOUT the slot walk when `bodyMask` is zero, so a machine with bodies takes a
// different door and is a different subject. See exoMachineSettle.ts:9.
function programOf(): TExoMachineProgram<TExoCommitNode> {
    return compileExoMachine<TExoCommitNode>({
        fields: FIELDS,
        pendingRow: PENDING_ROW,
        derivations: DERIVATIONS,
    });
}

function nodeOf(): TExoCommitNode {
    const ports: unknown[] = new Array<unknown>(PORTS).fill(0);
    const managedState: unknown[] = new Array<unknown>(STATE_ROWS).fill(0);
    managedState[QUANTITY] = 3;
    managedState[UNIT_PRICE] = 7;
    managedState[DISCOUNT] = 2;
    managedState[TAX_RATE] = 5;
    managedState[CURRENCY] = 11;
    managedState[SUBTOTAL] = 21;
    managedState[PENDING_ROW] = 0;
    return {
        managedState: managedState,
        ports: ports,
        attr(port, value: unknown): void {
            this.ports[port.index] = value;
        },
        text(port, value: unknown): void {
            this.ports[port.index] = value;
        },
        unsafeHtml(port, value: unknown): void {
            this.ports[port.index] = value;
        },
    };
}

function filledNodeOf(program: TExoMachineProgram<TExoCommitNode>): TExoCommitNode {
    const node = nodeOf();
    fillExoMachineDerivations(program, node);
    return node;
}

function floorStateOf(): TExoCommitFloorState {
    return {
        quantity: 3,
        unitPrice: 7,
        discount: 2,
        taxRate: 5,
        currency: 11,
        subtotal: 21,
    };
}

function floorPortsOf(state: TExoCommitFloorState): number[] {
    state.subtotal = state.quantity * state.unitPrice;
    return [
        state.subtotal - state.discount,
        state.subtotal * state.taxRate,
        state.subtotal - state.discount + state.subtotal * state.taxRate,
        state.currency + state.quantity,
        state.unitPrice + state.currency,
    ];
}

// Small and repeating, so every value stays a small integer and no row is measured on the cost of
// boxing a double that another row happened to avoid.
function streamOf(calls: number): readonly number[] {
    const out: number[] = new Array<number>(calls);
    for (let i = 0; i < calls; i++) out[i] = (i % 29) + 1;
    return out;
}

function sceneOf(name: string, written: readonly number[], calls: number): TExoCommitScene {
    const program = programOf();
    // THE INSTRUMENT: the same compiler run twice, so the twin's program and instance are its own
    // and its true difference from the shipped row is zero.
    const twinProgram = programOf();
    const denseProgram = programOf();
    const chainProgram = programOf();
    const floorState = floorStateOf();
    return {
        name: name,
        written: written,
        stream: streamOf(calls),
        program: program,
        node: filledNodeOf(program),
        twinProgram: twinProgram,
        twinNode: filledNodeOf(twinProgram),
        denseProgram: denseProgram,
        denseNode: filledNodeOf(denseProgram),
        chainProgram: chainProgram,
        chainNode: filledNodeOf(chainProgram),
        wakes: chainExoMachineWakes(chainProgram),
        floorState: floorState,
        floorPorts: floorPortsOf(floorState),
    };
}

/**
 * WHICH FIELDS A TRANSITION WRITES IS THE WHOLE QUESTION a pending word exists to answer, so the
 * shapes are the ones a transition really has: one field, one field whose derivation feeds three
 * more, three fields at once, every field, and none at all.
 */
export const EXO_MACHINE_COMMIT_SCENES: readonly {
    readonly name: string;
    readonly why: string;
    readonly build: (calls: number) => TExoCommitScene;
}[] = [
    {
        name: 'one·field',
        why: 'taxRate alone wakes two derivations of six — what the mask is for',
        build: (calls) => sceneOf('one·field', [TAX_RATE], calls),
    },
    {
        name: 'chained',
        why: 'quantity wakes two, and one of them stores subtotal, which wakes three more',
        build: (calls) => sceneOf('chained', [QUANTITY], calls),
    },
    {
        name: 'three·fields',
        why: 'discount, taxRate and currency together — five derivations, no chain',
        build: (calls) => sceneOf('three·fields', [DISCOUNT, TAX_RATE, CURRENCY], calls),
    },
    {
        name: 'all·fields',
        why: 'every input field written, so every derivation runs and the mask saves nothing',
        build: (calls) =>
            sceneOf('all·fields', [QUANTITY, UNIT_PRICE, DISCOUNT, TAX_RATE, CURRENCY], calls),
    },
    {
        name: 'nothing',
        why: 'a transition that wrote no field — one load and a return, and it is common',
        build: (calls) => sceneOf('nothing', [], calls),
    },
];
