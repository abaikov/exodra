import type { TExoAttrPort, TExoChildrenPort, TExoTextPort } from '@exodra/core';
import type { TExoMachineProgram } from '../../../src/machine/types/TExoMachineProgram';
import type { TExoMachineWake } from '../../../src/machine/types/TExoMachineWake';

/**
 * The instance a machine commits into: a state row per field plus the pending word, and the doors
 * every port-targeted derivation writes through. It is the whole of `TExoCommitNode` and nothing
 * more, which is the point of that interface — a machine never learns what backend it decorates.
 */
export type TExoCommitNode = {
    readonly managedState: unknown[];
    readonly ports: unknown[];
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** The floor's state: six named fields on one plain object, and its own output slots. */
export type TExoCommitFloorState = {
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    currency: number;
    subtotal: number;
};

/**
 * One transition shape — which fields a transition writes — with every candidate's machine already
 * compiled and already filled once. Compilation is outside the timed region because it is outside
 * it in the library: `compileExoMachine` runs at module load, `chainExoMachineWakes` once per
 * program, and the fill once per instance.
 */
export type TExoCommitScene = {
    readonly name: string;
    /** Field addresses a transition writes. Addresses ARE state rows here, as in a real machine. */
    readonly written: readonly number[];
    readonly stream: readonly number[];
    readonly program: TExoMachineProgram<TExoCommitNode>;
    readonly node: TExoCommitNode;
    readonly twinProgram: TExoMachineProgram<TExoCommitNode>;
    readonly twinNode: TExoCommitNode;
    readonly denseProgram: TExoMachineProgram<TExoCommitNode>;
    readonly denseNode: TExoCommitNode;
    readonly chainProgram: TExoMachineProgram<TExoCommitNode>;
    readonly chainNode: TExoCommitNode;
    readonly wakes: readonly (TExoMachineWake<TExoCommitNode> | null)[];
    readonly floorState: TExoCommitFloorState;
    readonly floorPorts: number[];
};
