import {
    armExoNode,
    assertExoArming,
    assertExoChildrenPort,
    EXO_UNARMED_STATE,
    exoVocabulary,
} from '@exodra/core';
import type {
    TExoBaseNodeFields,
    TExoBaseNodeMethods,
    TExoNode,
    TExoEventHandler,
    TExoEventPort,
    TExoPortNodeReader,
    TExoPortTable,
    TExoPortNodeWriter,
    TExoAttrPort,
    TExoTextPort,
    TExoChildrenPort,
} from '@exodra/core';
import { renderExoStrInstance } from './renderExoStrInstance';
import { placeExoStrChild } from './placeExoStrChild';
import { disposeExoStrTree } from './disposeExoStrTree';
import { createExoStrChildList } from './factories/createExoStrChildList';
import { exoStrSchemaOf } from '../schema/exoStrSchemaOf';
import type { TExoStrChildList } from './types/TExoStrChildList';
import type { TExoStrMachine } from './types/TExoStrMachine';
import type { TExoStrMark } from '../schema/types/TExoStrMark';
import type { TExoStrSchema } from '../schema/types/TExoStrSchema';
import type { TExoStrWriter } from '../writers/types/TExoStrWriter';

const noExoStrNode = (): undefined => undefined;

export type TExoStrNode = TExoStrNodeFields & TExoStrSurface;

/** Written by `createExoStrInstanceFactory`'s constructor in THIS ORDER — it is the in-object layout. */
export type TExoStrNodeFields = TExoBaseNodeFields & {
    /** One slot per port, in `index` order — what `fillMarkup` reads. */
    readonly values: string[];
    readonly writers: readonly TExoStrWriter[];
    readonly schema: TExoStrSchema;
    portChildren: (TExoStrNode | string)[][] | null;
    placedIn: (TExoStrNode | string)[] | null;
};

/** What this backend answers on top of `EXO_BASE_NODE_VOCABULARY` (`ports`, `onTeardown`, `provide`, `inject`). */
export interface TExoStrNodeApi {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    portTable(): TExoPortTable;
    portNodeWriter(): TExoPortNodeWriter;
    portNodeReader(): TExoPortNodeReader<undefined>;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
    one(port: TExoChildrenPort, machine: TExoStrMachine, params?: unknown): void;
    list(port: TExoChildrenPort, machine: TExoStrMachine, params: readonly unknown[]): void;
    portChildList(port: TExoChildrenPort): TExoStrChildList;
    createExoNode(machine: TExoStrMachine): TExoNode<TExoStrMark>;
    armExoSelf(params: unknown): void;
    deferExoTransition(
        run: (enode: never, first: unknown, second: unknown) => void,
        first: unknown,
        second: unknown
    ): boolean;
    destroyExoSelf(): void;
    appendChild<TNode extends TExoNode<TExoStrMark>>(port: TExoChildrenPort, node: TNode): TNode;
    insertChild<TNode extends TExoNode<TExoStrMark>>(
        port: TExoChildrenPort,
        node: TNode,
        at: number
    ): TNode;
    moveChild(node: TExoNode<TExoStrMark>, at: number): void;
    moveChild(node: TExoNode<TExoStrMark>, port: TExoChildrenPort, at?: number): void;
    removeChild<TNode extends TExoNode<TExoStrMark>>(node: TNode): TNode;
    replaceChildren(port: TExoChildrenPort): void;
    childAt(port: TExoChildrenPort, at: number): TExoNode<TExoStrMark> | undefined;
    childCount(port: TExoChildrenPort): number;
}

/**
 * An `interface` and not an alias: `this` types are legal only in interfaces and classes, and as an
 * alias TS2526 degrades every `this` to `any` — component parameters then accept anything.
 */
export interface TExoStrSurface extends TExoStrNodeApi, TExoBaseNodeMethods {}

function portChildrenOf(owner: TExoStrNode, port: TExoChildrenPort): (TExoStrNode | string)[] {
    const lists = (owner.portChildren ??= []);
    return (lists[port.index] ??= []);
}

const EXO_STR_NODE_METHODS: TExoStrNodeApi & ThisType<TExoStrNode> = {
    attr(port: TExoAttrPort, value: unknown): void {
        const index = port.index;
        this.values[index] = this.writers[index](value);
    },

    /** Its OWN line and not a hop through `attr`, as in `@exodra/dom`: two doors sharing one call
     * site make that site see every attribute body and every text body at once, and text is most
     * of what a server render writes. */
    text(port: TExoTextPort, value: unknown): void {
        const index = port.index;
        this.values[index] = this.writers[index](value);
    },

    unsafeHtml(port: TExoChildrenPort, markup: unknown): void {
        const index = port.index;
        this.values[index] = this.writers[index](markup);
    },

    portTable(): TExoPortTable {
        return this.values as unknown as TExoPortTable;
    },

    /** The cache slot is the SCHEMA's: a per-instance one would rebuild it for every row. */
    portNodeWriter(): TExoPortNodeWriter {
        const schema = this.schema;
        let write = schema.strPortWrite;
        if (write === null) {
            const writers = schema.writers;
            write = (table, port, value): void => {
                const index = port.index;
                (table as unknown as string[])[index] = writers[index](value);
            };
            schema.strPortWrite = write;
        }
        return write;
    },

    /** `undefined` rather than a throw: `Element | undefined` is the true type of a server read. */
    portNodeReader(): TExoPortNodeReader<undefined> {
        return noExoStrNode;
    },

    /**
     * Accepted in both forms and printed as nothing; refusing it would force a second wiring
     * function for the server. NOTHING IS WRITTEN AND NOTHING HAS TO BE: an event port's writer is
     * `EXO_STR_WRITERS.event` — it returns `''` — and the instance's slot is already `''`, so the
     * store was `''` over `''`. The slot is indexed by the port's own number, which is shared with
     * `@exodra/dom` whether or not anything writes it. The writer stays in the table because a wire
     * reaching this port through `portNodeWriter()` goes through it instead of through here.
     */
    on(): void {},

    one(port: TExoChildrenPort, machine: TExoStrMachine, params?: unknown): void {
        assertExoArming('one');
        this.values[port.index] = renderExoStrInstance(
            exoStrSchemaOf(machine, this.schema.backend),
            machine,
            this.context,
            params
        );
    },

    /**
     * An empty list is still COMPILED: `compileExoStrSchema` refuses some schemas, so a component
     * whose first render had no rows would otherwise pass here and be refused a request later.
     */
    list(port: TExoChildrenPort, machine: TExoStrMachine, params: readonly unknown[]): void {
        assertExoArming('list');
        const schema = exoStrSchemaOf(machine, this.schema.backend);
        const context = this.context;
        // `+=` and not an array joined at the end: accumulating rows and joining measured SLOWER
        // (README, "Measured costs").
        let html = '';
        for (let i = 0; i < params.length; i++) {
            html += renderExoStrInstance(schema, machine, context, params[i]);
        }
        this.values[port.index] = html;
    },

    /** The SAME door `@exodra/dom` and `@exodra/term` answer, so a component that reconciles its
     *  children prints on the server from one wiring function. A reconciler's first pass over an
     *  empty list is insert-only, which is the whole of what a request ever needs. */
    portChildList(port: TExoChildrenPort): TExoStrChildList {
        assertExoChildrenPort(port, 'portChildList', 'TExoStrNode');
        return createExoStrChildList(portChildrenOf(this, port));
    },

    createExoNode(machine: TExoStrMachine): TExoNode<TExoStrMark> {
        const schema = exoStrSchemaOf(machine, this.schema.backend);
        const node = schema.createInstance(schema, this.context);
        node.machine = machine;
        node.state = EXO_UNARMED_STATE;
        return node as unknown as TExoNode<TExoStrMark>;
    },

    armExoSelf(params: unknown): void {
        try {
            armExoNode<TExoStrNode>(this, this.machine as TExoStrMachine, params);
        } catch (error) {
            disposeExoStrTree(this);
            throw error;
        }
    },

    deferExoTransition(): boolean {
        this.armExoSelf(undefined);
        return false;
    },

    destroyExoSelf(): void {
        const from = this.placedIn;
        if (from !== null) {
            from.splice(from.indexOf(this), 1);
            this.placedIn = null;
        }
        disposeExoStrTree(this);
    },

    appendChild<TNode extends TExoNode<TExoStrMark>>(port: TExoChildrenPort, node: TNode): TNode {
        placeExoStrChild(portChildrenOf(this, port), node as unknown as TExoStrNode | string);
        return node;
    },

    insertChild<TNode extends TExoNode<TExoStrMark>>(
        port: TExoChildrenPort,
        node: TNode,
        at: number
    ): TNode {
        placeExoStrChild(portChildrenOf(this, port), node as unknown as TExoStrNode | string, at);
        return node;
    },

    moveChild(node: TExoNode<TExoStrMark>, portOrAt: TExoChildrenPort | number, at?: number): void {
        const child = node as unknown as TExoStrNode | string;
        if (typeof child === 'string') return;
        if (typeof portOrAt === 'number') {
            const from = child.placedIn;
            if (from !== null) placeExoStrChild(from, child, portOrAt);
            return;
        }
        placeExoStrChild(portChildrenOf(this, portOrAt), child, at);
    },

    removeChild<TNode extends TExoNode<TExoStrMark>>(node: TNode): TNode {
        const child = node as unknown as TExoStrNode | string;
        if (typeof child === 'string') return node;
        const from = child.placedIn;
        if (from !== null) {
            from.splice(from.indexOf(child), 1);
            child.placedIn = null;
        }
        return node;
    },

    replaceChildren(port: TExoChildrenPort): void {
        createExoStrChildList(portChildrenOf(this, port)).removeAll();
    },

    childAt(port: TExoChildrenPort, at: number): TExoNode<TExoStrMark> | undefined {
        return portChildrenOf(this, port)[at] as unknown as TExoNode<TExoStrMark> | undefined;
    },

    childCount(port: TExoChildrenPort): number {
        return portChildrenOf(this, port).length;
    },
};

/** Merged after the base and before the application's packs, which may WRAP any of these. */
export const EXO_STR_NODE_VOCABULARY = /*#__PURE__*/ exoVocabulary(EXO_STR_NODE_METHODS);
