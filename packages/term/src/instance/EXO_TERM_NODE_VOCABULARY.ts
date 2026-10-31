import { assertExoArming, exoVocabulary } from '@exodra/core';
import type {
    TExoBaseNodeMethods,
    TExoMachine,
    TExoEventHandler,
    TExoEventPort,
    TExoNode,
    TExoPort,
    TExoPortNodeReader,
    TExoPortTable,
    TExoPortNodeWriter,
    TExoAttrPort,
    TExoTextPort,
    TExoChildrenPort,
} from '@exodra/core';
import { exoTermSchemaOf } from '../schema/exoTermSchemaOf';
import { createExoTermChildList } from './factories/createExoTermChildList';
import { renderExoTermInstance } from '../rendering/renderExoTermInstance';
import type { TExoTermChildList } from './types/TExoTermChildList';
import type { TExoTermChild, TExoTermRegion } from './types/TExoTermChild';
import type { TExoTermMark } from '../rendering/types/TExoTermMark';
import type { TExoTermElement } from './types/TExoTermElement';
import type { TExoTermEvent } from '../utilities/types/TExoTermEvent';
import type { TExoTermSchema } from '../schema/types/TExoTermSchema';
import type { TExoTermMachine } from './types/TExoTermMachine';
import type { TExoTermWriter } from '../utilities/types/TExoTermWriter';

const HERE = 'TExoTermNode';

// Catches a port belonging to a DIFFERENT schema than the one being wired — a port is just an object
// with an index on it, so nothing in the shared surface can. A module-level function and not a
// member, because every name on the methods table becomes a name a wire can call.
function requireExoTermRegion(
    regions: readonly (TExoTermRegion | null)[],
    port: TExoPort,
    call: string
): TExoTermRegion {
    const region = regions[port.index];
    if (region === null || region === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${HERE}: ${call}() was given a children port that this instance does not have ` +
                  `(index ${port.index}) — a port may only be filled by the wire of the ` +
                  'component whose schema declared it'
                : 'EXO0068'
        );
    }
    return region;
}

// What a wiring function is handed: THE INSTANCE ITSELF, with the composed backend as its prototype.
// There is no connector object and no pool, so a subscriber may hold `this` past its render.
export type TExoTermNode = TExoTermNodeFields & TExoTermSurface;

// The order is `createExoTermInstanceFactory`'s constructor-body order and part of the contract: a field's
// index is its in-object offset, and the first six are `exoForeignTermNode`'s six.
export type TExoTermNodeFields = TExoTermChild & {
    readonly schema: TExoTermSchema;
    /** The tree node each port writes to, by PORT index. */
    readonly slots: TExoTermElement[];
    /** The schema's writers, copied here so `set` is two array loads rather than three. */
    readonly writers: readonly TExoTermWriter[];
    /** The event name of each event port, `null` elsewhere. */
    readonly names: readonly (string | null)[];
};

export interface TExoTermNodeApi {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    portTable(): TExoPortTable;
    portNodeWriter(): TExoPortNodeWriter;
    portNodeReader(): TExoPortNodeReader<TExoTermElement>;
    on(
        port: TExoEventPort,
        handler: TExoEventHandler<TExoTermEvent, TExoTermElement>,
        subject?: unknown
    ): void;
    build<TParams>(
        machine: TExoMachine<this, unknown, TParams>,
        index?: number,
        params?: TParams
    ): TExoNode<TExoTermMark>;
    one<TParams>(
        port: TExoChildrenPort,
        machine: TExoMachine<this, unknown, TParams>,
        params?: TParams
    ): void;
    list(port: TExoChildrenPort, machine: TExoMachine<this>, count: number): void;
    childList(port: TExoChildrenPort): TExoTermChildList;
}

// AN `interface` AND NOT AN ALIAS, because the component-taking members name `this`: `this` types
// are legal in interfaces and classes only, and as an alias this answers TS2526 — after which
// TypeScript degrades the erroring `this` to `any` and those parameters accept everything.
//
// Every member is written in METHOD SHORTHAND, and that is what makes `TExoTermNode` assignable
// to core's connector types. See README, "The acceptance test".
export interface TExoTermSurface extends TExoTermNodeApi, TExoBaseNodeMethods {}

const EXO_TERM_NODE_METHODS: TExoTermNodeApi & ThisType<TExoTermNode> = {
    attr(port: TExoAttrPort, value: unknown): void {
        const index = port.index;
        this.writers[index](this.slots[index], value);
    },

    text(port: TExoTextPort, value: unknown): void {
        this.attr(port as unknown as TExoAttrPort, value);
    },

    unsafeHtml(port: TExoChildrenPort, markup: unknown): void {
        this.attr(port as unknown as TExoAttrPort, markup);
    },

    portTable(): TExoPortTable {
        return this.slots as unknown as TExoPortTable;
    },

    // The cache slot is the SCHEMA's: the closure captures the schema's writers and nothing per
    // instance, so a per-instance slot would rebuild it for every row of every list.
    portNodeWriter(): TExoPortNodeWriter {
        const schema = this.schema;
        let write = schema.termPortWrite;
        if (write === null) {
            const writers = schema.writers;
            write = (table, port, value): void => {
                const index = port.index;
                writers[index]((table as unknown as TExoTermElement[])[index], value);
            };
            schema.termPortWrite = write;
        }
        return write;
    },

    // `refPort()` was designed for a DOM element — observe, focus, measure, none of which means
    // anything here — but the ADDRESS crosses for free, since every port's slot already holds it.
    portNodeReader(): TExoPortNodeReader<TExoTermElement> {
        const schema = this.schema;
        let at = schema.termPortNodes;
        if (at === null) {
            at = (table, port): TExoTermElement =>
                (table as unknown as TExoTermElement[])[port.index];
            schema.termPortNodes = at;
        }
        return at;
    },

    // Nothing is attached — a text tree has no event system. `exoTermFire` is what runs a handler.
    on(
        port: TExoEventPort,
        handler: TExoEventHandler<TExoTermEvent, TExoTermElement>,
        subject?: unknown
    ): void {
        const index = port.index;
        const name = this.names[index];
        if (name === null) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${HERE}: an event port with no name cannot be listened for`
                    : 'EXO0069'
            );
        }
        this.slots[index].listeners[name] = { handler, subject };
    },

    // A CHILD BUILT AND NEVER PLACED IS THE CALLER'S LEAK: nothing in the exported surface can
    // express ownership of a `TExoNode`, so it keeps its subscriptions until its source dies.
    build(machine: TExoTermMachine, index = 0, params?: unknown): TExoNode<TExoTermMark> {
        return renderExoTermInstance(
            exoTermSchemaOf(machine, this.schema.backend),
            machine,
            index,
            this.context,
            params
        ) as unknown as TExoNode<TExoTermMark>;
    },

    one(port: TExoChildrenPort, machine: TExoTermMachine, params?: unknown): void {
        assertExoArming('one');
        const region = requireExoTermRegion(this.regions, port, 'one');
        region.children = [
            renderExoTermInstance(
                exoTermSchemaOf(machine, this.schema.backend),
                machine,
                0,
                this.context,
                params
            ),
        ];
    },

    list(port: TExoChildrenPort, machine: TExoTermMachine, count: number): void {
        assertExoArming('list');
        const region = requireExoTermRegion(this.regions, port, 'list');
        const schema = exoTermSchemaOf(machine, this.schema.backend);
        const context = this.context;
        const built: TExoTermChild[] = new Array(count);
        for (let i = 0; i < count; i++)
            built[i] = renderExoTermInstance(schema, machine, i, context);
        region.children = built;
    },

    /** The imperative half: a handle on the region, so a caller places what `build` handed it. */
    childList(port: TExoChildrenPort): TExoTermChildList {
        assertExoArming('childList');
        return createExoTermChildList(requireExoTermRegion(this.regions, port, 'childList'));
    },
};

// Merged AFTER `EXO_BASE_NODE_VOCABULARY` and before the application's own plugins, so a plugin naming one
// of these receives it as `next` and may wrap it.
export const EXO_TERM_NODE_VOCABULARY = exoVocabulary(EXO_TERM_NODE_METHODS);

// In source rather than in a test, because every tsconfig here excludes `*.test.ts` and a type
// assertion nothing typechecks asserts nothing. If either stops holding, core's portable surface has
// grown a member only a shipped backend can satisfy.
type TAssert<T extends true> = T;
export type TExoTermSatisfiesCoreValues = TAssert<
    TExoTermNode extends import('@exodra/core').TExoWiring ? true : false
>;
export type TExoTermSatisfiesCoreChildren = TAssert<
    TExoTermNode extends import('@exodra/core').TExoChildrenWiring ? true : false
>;
