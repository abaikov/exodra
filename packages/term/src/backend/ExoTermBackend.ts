import { EXO_BASE_NODE_VOCABULARY, composeExoPlugins, nextExoBackendType } from '@exodra/core';
import type { TExoMachine, TExoMergedPluginMethods, TExoPlugin } from '@exodra/core';
import type { TExoTermSchema } from '../schema/types/TExoTermSchema';
import { disposeExoTermChild } from '../instance/disposeExoTermChild';
import { EXO_TERM_NODE_VOCABULARY } from '../instance/EXO_TERM_NODE_VOCABULARY';
import type { TExoTermSurface, TExoTermNodeFields } from '../instance/EXO_TERM_NODE_VOCABULARY';
import { exoTermContextSlot } from '../utilities/exoTermContextSlot';
import { createExoTermInstanceFactory } from '../instance/createExoTermInstanceFactory';
import { exoTermSchemaOf } from '../schema/exoTermSchemaOf';
import type { TExoTermApi } from './types/TExoTermApi';
import { exoTermText } from '../instance/exoTermText';
import type { TExoTermTextOptions } from '../instance/exoTermText';
import { renderExoTermInstance } from '../rendering/renderExoTermInstance';
import type { TExoTermChild } from '../instance/types/TExoTermChild';
import type { TExoTermMachine } from '../instance/types/TExoTermMachine';
import type { TExoTermElement } from '../instance/types/TExoTermElement';
import type { TExoTermScreen } from '../rendering/types/TExoTermScreen';

// BUILD ONE, AT MODULE LEVEL: `exoTermSchemaOf(schema, this)` keys a declaration's schema on this
// object by pointer, so a backend constructed per render recompiles every schema it touches.
class ExoTermBackendBase {
    readonly backendType: number = nextExoBackendType();
    // A FIELD INITIALISER: it must run BEFORE `composeExoPlugins`, so a pack naming `createInstance`
    // overwrites this and not the reverse — and once, a second constructor being a second map.
    createInstance: TExoTermApi['createInstance'] = createExoTermInstanceFactory(this);

    constructor(...plugins: readonly TExoPlugin[]) {
        // ORDER IS THE MECHANISM: a pack naming one of these gets the shipped body as `next`.
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY, EXO_TERM_NODE_VOCABULARY, ...plugins);
    }

    /** Compile now, off the first screen; the schema is cached on the machine either way. */
    schema(machine: TExoMachine<never>): TExoTermSchema {
        return exoTermSchemaOf(machine, this as unknown as TExoTermApi);
    }

    // GENERIC OVER THE PORTS and not over the wiring: the parameter is `this & TExoTermNodeFields`
    // because an exonode is contravariant in a wire, so a flat spelling refuses a wire naming a
    // method a pack merged on. The ports are the schema's own and nothing here reads them.
    renderScreen<TPorts>(
        component: TExoMachine<this & TExoTermNodeFields, TPorts>,
        n: number,
        params?: unknown
    ): TExoTermScreen {
        // A class's declared instance type is fixed: it cannot show what `composeExoPlugins` wrote.
        const backend = this as unknown as TExoTermApi;
        const schema = exoTermSchemaOf(component, backend);
        const children: TExoTermChild[] = new Array(n);
        const roots: TExoTermElement[] = new Array(n);
        // The ONE line in the package that reads the slot; below here the chain lives on instances.
        const context = exoTermContextSlot.frame;
        for (let i = 0; i < n; i++) {
            const child = renderExoTermInstance(
                schema,
                component as unknown as TExoTermMachine,
                i,
                context,
                params
            );
            children[i] = child;
            roots[i] = child.node;
        }
        return {
            roots,
            text(options?: TExoTermTextOptions): string {
                let out = '';
                for (let i = 0; i < roots.length; i++) {
                    if (i > 0) out += '\n';
                    out += exoTermText(roots[i], options);
                }
                return out;
            },
            dispose(): void {
                for (let i = 0; i < children.length; i++) disposeExoTermChild(children[i]);
            },
        };
    }
}

// A class's instance type is fixed, so the constructor is declared as an interface and the type is
// COMPUTED from the arguments: a backend composed without a pack is refused at the wire naming it.
export interface TExoTermBackendConstructor {
    new <TPacks extends readonly TExoPlugin[]>(...plugins: TPacks): ExoTermBackendBase &
        TExoTermSurface &
        TExoMergedPluginMethods<TPacks>;
}

export const ExoTermBackend = ExoTermBackendBase as unknown as TExoTermBackendConstructor;

// ANNOTATING A COMPOSED BACKEND WITH THIS ERASES EVERY METHOD ITS PACKS ADDED.
export type TExoTermBackend = ExoTermBackendBase & TExoTermSurface;
