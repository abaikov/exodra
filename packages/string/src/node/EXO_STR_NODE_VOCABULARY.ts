import { assertExoArming, assertExoChildrenPort, exoVocabulary } from '@exodra/core';
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
import { buildExoStrInstance } from './buildExoStrInstance';
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
    childList(port: TExoChildrenPort): TExoStrChildList;
    build(machine: TExoStrMachine, params?: unknown): TExoNode<TExoStrMark>;
}

/**
 * An `interface` and not an alias: `this` types are legal only in interfaces and classes, and as an
 * alias TS2526 degrades every `this` to `any` — component parameters then accept anything.
 */
export interface TExoStrSurface extends TExoStrNodeApi, TExoBaseNodeMethods {}

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
    childList(port: TExoChildrenPort): TExoStrChildList {
        assertExoChildrenPort(port, 'childList', 'TExoStrNode');
        assertExoArming('childList');
        return createExoStrChildList(this.values, port.index, []);
    },

    build(machine: TExoStrMachine, params?: unknown): TExoNode<TExoStrMark> {
        return buildExoStrInstance(
            exoStrSchemaOf(machine, this.schema.backend),
            machine,
            this.context,
            params
        ) as unknown as TExoNode<TExoStrMark>;
    },
};

/** Merged after the base and before the application's packs, which may WRAP any of these. */
export const EXO_STR_NODE_VOCABULARY = /*#__PURE__*/ exoVocabulary(EXO_STR_NODE_METHODS);
