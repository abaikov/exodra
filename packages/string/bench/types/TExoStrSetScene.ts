import type {
    TExoPortNodeWriter,
    TExoAttrPort,
    TExoTextPort,
    TExoChildrenPort,
} from '@exodra/core';
import type { TExoStrWriter } from '../../src/writers/types/TExoStrWriter';

/** What `TExoStrNode`'s fill doors need of a receiver: the two fields they index, and the doors. */
export type TExoStrSetNode = {
    values: string[];
    writers: readonly TExoStrWriter[];
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** A port carrying its own writer — the design that saves one indexed load per write. */
export type TExoStrWritePort = {
    readonly index: number;
    readonly write: TExoStrWriter;
};

/**
 * One component's port mix, with every candidate's state already built. `streams` holds one values
 * array per instance, so a drive writes every port of an instance and then moves to the next —
 * which is the order `renderExoStrInstance` produces and the order the writer call site really sees.
 */
export type TExoStrSetScene = {
    readonly name: string;
    readonly ports: readonly TExoAttrPort[];
    readonly node: TExoStrSetNode;
    readonly twinNode: TExoStrSetNode;
    readonly schemaWrite: TExoPortNodeWriter;
    readonly schemaTable: TExoPortTableSlots;
    readonly writePorts: readonly TExoStrWritePort[];
    readonly writeValues: string[];
    readonly floorValues: string[];
    readonly floor: (values: string[], v: readonly string[]) => void;
    readonly streams: readonly (readonly string[])[];
};

/** The string array a schema's writer closure writes into, before it is handed over as a token. */
export type TExoPortTableSlots = string[];
