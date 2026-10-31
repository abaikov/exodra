import { EXO_BASE_NODE_VOCABULARY, composeExoPlugins, nextExoBackendType } from '@exodra/core';
import type { TExoMachine, TExoMergedPluginMethods, TExoPlugin } from '@exodra/core';
import type { TExoStrSchema } from '../schema/types/TExoStrSchema';
import type { TExoContextFrame } from '@exodra/context';
import { EXO_STR_NODE_VOCABULARY } from './EXO_STR_NODE_VOCABULARY';
import type { TExoStrSurface, TExoStrNodeFields } from './EXO_STR_NODE_VOCABULARY';
import { exoStrSchemaOf } from '../schema/exoStrSchemaOf';
import { createExoStrInstanceFactory } from './factories/createExoStrInstanceFactory';
import { renderExoStrInstance } from './renderExoStrInstance';
import type { TExoStrMachine } from './types/TExoStrMachine';
import type { TExoStrApi } from './types/TExoStrApi';

// A pack replacing a DOM-ONLY field is silently INERT here; README, "Traps".
class ExoStrBackendBase {
    readonly backendType: number = nextExoBackendType();
    // A field initialiser, NOT a constructor line: it runs BEFORE `composeExoPlugins`, so a pack
    // naming `createInstance` overwrites this and not the reverse — and exactly once, a second
    // constructor over this prototype being a second hidden class.
    createInstance: TExoStrApi['createInstance'] = createExoStrInstanceFactory(this);

    constructor(...plugins: readonly TExoPlugin[]) {
        // The order is the mechanism: a pack receives what came before as `next` and may WRAP it.
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY, EXO_STR_NODE_VOCABULARY, ...plugins);
    }

    /** Compile now, off the first request; the schema is cached on the machine either way. */
    schema(machine: TExoMachine<never>): TExoStrSchema {
        return exoStrSchemaOf(machine, this as unknown as TExoStrApi);
    }

    render(
        machine: TExoMachine<this & TExoStrNodeFields> | TExoMachine<this & TExoStrNodeFields>,
        context: TExoContextFrame | null = null,
        params?: unknown
    ): string {
        // `composeExoPlugins` wrote the methods onto `this`; no class declaration can show that.
        const backend = this as unknown as TExoStrApi;
        const schema = exoStrSchemaOf(machine, backend);
        return renderExoStrInstance(
            schema,
            machine as unknown as TExoStrMachine,
            0,
            context,
            params
        );
    }
}

// A class's instance type is fixed, so the type is computed from the constructor ARGUMENTS.
export interface TExoStrBackendConstructor {
    new <TPacks extends readonly TExoPlugin[]>(...plugins: TPacks): ExoStrBackendBase &
        TExoStrSurface &
        TExoMergedPluginMethods<TPacks>;
}

export const ExoStrBackend = ExoStrBackendBase as unknown as TExoStrBackendConstructor;

// Annotating a COMPOSED backend with this erases every method its packs added.
export type TExoStrBackend = ExoStrBackendBase & TExoStrSurface;
