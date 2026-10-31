import { EXO_NO_MANAGED_STATE, EXO_NO_STATE } from '@exodra/core';
import type { TExoContextFrame } from '@exodra/context';
import type { TExoStrNode, TExoStrNodeFields } from '../EXO_STR_NODE_VOCABULARY';
import type { TExoStrSchema } from '../../schema/types/TExoStrSchema';

// `TExoStrNodeFields` with `readonly` lifted: fixed to every reader, assigned once here.
type TExoStrNodeInit = { -readonly [K in keyof TExoStrNodeFields]: TExoStrNodeFields[K] };

type TExoStrNodeConstructor = new (
    schema: TExoStrSchema,
    context: TExoContextFrame | null
) => TExoStrNode;

// One allocation site per COMPOSED BACKEND: a pack needing per-instance fields replaces this whole
// allocator, because methods compose and fields do not. CALL IT ONCE PER BACKEND — every
// constructor carries its own initial map, so a second call gives one composition TWO hidden
// classes. Slots are `''` rather than holes because `fillMarkup` reads them all.
export function createExoStrInstanceFactory(backend: object): TExoStrSchema['createInstance'] {
    function ExoStrInstanceBody(
        this: TExoStrNodeInit,
        schema: TExoStrSchema,
        context: TExoContextFrame | null
    ): void {
        const portCount = schema.portCount;
        const values: string[] = [];
        for (let i = 0; i < portCount; i++) values.push('');
        this.context = context;
        this.disposers = null;
        this.state = EXO_NO_STATE;
        this.managedState = EXO_NO_MANAGED_STATE;
        this.effectStops = null;
        this.transitionOverrides = null;
        this.serviceState = undefined;
        this.values = values;
        this.writers = schema.writers;
        this.schema = schema;
    }
    // The backend is still EMPTY of methods here; sound because what is stored is the POINTER.
    ExoStrInstanceBody.prototype = backend;
    const ExoStrInstance = ExoStrInstanceBody as unknown as TExoStrNodeConstructor;
    return (schema, context) => new ExoStrInstance(schema, context);
}
