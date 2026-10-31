import { EXO_NO_MANAGED_STATE, EXO_NO_STATE } from '@exodra/core';
import type { TExoContextFrame } from '@exodra/context';
import type { TExoTermNode, TExoTermNodeFields } from './EXO_TERM_NODE_VOCABULARY';
import { instantiateExoTermProto } from './instantiateExoTermProto';
import type { TExoTermRegion } from './types/TExoTermChild';
import type { TExoTermElement } from './types/TExoTermElement';
import type { TExoTermSchema } from '../schema/types/TExoTermSchema';

type TExoTermNodeInit = {
    -readonly [K in keyof TExoTermNodeFields]: TExoTermNodeFields[K];
};

type TExoTermNodeConstructor = new (
    schema: TExoTermSchema,
    context: TExoContextFrame | null
) => TExoTermNode;

// The one allocation site for a terminal instance, and the seam a pack replaces WHOLE to give every
// instance fields of its own — methods compose through `composeExoPlugins`, fields do not.
// A CONSTRUCTOR because a `{ __proto__: expr, … }` key costs ~107 ns per object where `new`,
// `Object.create` and a plain literal all cost 4.75 (README, "Why a constructor"). CALL IT ONCE PER
// BACKEND — every constructor carries its own initial map, so a second call splits one composition
// across two hidden classes. Per instance: one `new`, two arrays of `portCount`, and the tree.
export function createExoTermInstanceFactory(backend: object): TExoTermSchema['createInstance'] {
    function ExoTermInstanceBody(
        this: TExoTermNodeInit,
        schema: TExoTermSchema,
        context: TExoContextFrame | null
    ): void {
        const portCount = schema.portCount;
        const slots: TExoTermElement[] = new Array(portCount);
        const regions: (TExoTermRegion | null)[] = new Array(portCount);
        for (let i = 0; i < portCount; i++) regions[i] = null;
        // The ten stores below are in `TExoTermNodeFields`'s declared order and must not drift: V8
        // sizes the in-object store from what this body assigns, and the first six are
        // `exoForeignTermNode`'s six. `disposers` starts `null`, not `[]` — an array here is one
        // allocation per ROW for a field only `bind*` or `c.onTeardown` ever fills.
        const node = instantiateExoTermProto(schema.proto, slots, regions);
        this.context = context;
        this.disposers = null;
        this.state = EXO_NO_STATE;
        this.managedState = EXO_NO_MANAGED_STATE;
        this.effectStops = null;
        this.transitionOverrides = null;
        this.serviceState = undefined;
        this.node = node;
        this.regions = regions;
        this.schema = schema;
        this.slots = slots;
        this.writers = schema.writers;
        this.names = schema.names;
    }
    // `backend` is still EMPTY of methods here; sound because what is stored is the pointer.
    ExoTermInstanceBody.prototype = backend;
    const ExoTermInstance = ExoTermInstanceBody as unknown as TExoTermNodeConstructor;
    return (schema, context) => new ExoTermInstance(schema, context);
}
