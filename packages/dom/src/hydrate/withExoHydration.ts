import { composeExoPlugins } from '@exodra/core';
import type { TExoMachine, TExoNode } from '@exodra/core';
import { createExoDomChildFactory } from '../dom/factories/createExoDomChildFactory';
import { createExoDomInstanceFactory } from '../dom/factories/createExoDomInstanceFactory';
import { exoOnTeardown, exoTeardownScope } from '../dom/exoTeardownScope';
import { EXO_HYDRATE_NODE_VOCABULARY } from './EXO_HYDRATE_NODE_VOCABULARY';
import { EXO_PARSER_STABILITY } from './constants/EXO_PARSER_STABILITY';
import { buildAdoptedExoChild } from './buildAdoptedExoChild';
import { mountExoDomNode } from '../dom/mountExoDomNode';
import type { TExoDomNodeApi } from '../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomChild } from '../dom/types/TExoDomChild';
import type { TExoDomMark } from '../dom/types/TExoDomMark';
import { exoHydrateSchemaOf } from './exoHydrateSchemaOf';
import { requireExoElement } from './requireExoElement';
import type { TExoDomSurface } from '../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomInstanceRecord } from '../dom/types/TExoDomInstanceRecord';
import type { TExoDomApi } from '../dom/types/TExoDomApi';
import type { TExoDomMachine } from '../dom/types/TExoDomMachine';
import type { TExoDomRecordFactories } from '../dom/types/TExoDomRecordFactories';
import type { TExoParserStability } from '../dom/types/TExoParserStability';

export interface TExoHydrationApi {
    // An `interface` and not an alias: as an alias the `this` type answers TS2526, TypeScript
    // degrades it to `any`, and the parameter then accepts every component in existence.
    hydrate<TParams>(
        machine: TExoMachine<this & TExoDomInstanceRecord, unknown, TParams>,
        parent: Element,
        params?: TParams
    ): () => void;
    adoptRoot<TParams>(
        machine: TExoMachine<this & TExoDomInstanceRecord, unknown, TParams>,
        parent: Element,
        params?: TParams
    ): TExoDomNodeApi & TExoNode<TExoDomMark>;
    hydrateSurface: TExoDomRecordFactories;
    parserStability: TExoParserStability;
}

// Why hydration is a PACK rather than a method, what the 3.2 kB gzipped buys, and why the merge
// order below is load-bearing: ../../README.md § Why hydration is a pack.
export const withExoHydration = <TBase extends TExoDomApi>(
    base: TBase
): TBase & TExoHydrationApi => {
    // `__proto__:` in a literal prices at 111.5 ns per object against 4.75 for a constructor
    // (`receiver-spelling`), which is why the record factories below are constructors and this is
    // not: ONE object per hydrating backend, once, before the first adoption.
    const surface = composeExoPlugins({ __proto__: base } as object, EXO_HYDRATE_NODE_VOCABULARY);
    // Over THIS object, because a constructor's prototype is fixed when the constructor is made and
    // an adopted record must find the ADOPTING bodies. Merged, so a later pack still gets `next`.
    composeExoPlugins(surface, {
        createInstance: (_next: unknown) => createExoDomInstanceFactory(surface),
        createChild: (_next: unknown) => createExoDomChildFactory(surface),
    });
    return composeExoPlugins(base, {
        hydrateSurface: (_next: unknown) => surface,
        // Claimed HERE and not in the render pack: a schema the parser reshapes is only a defect for
        // a page that was parsed, and this is the one composition that says the page was.
        parserStability: (_next: unknown) => EXO_PARSER_STABILITY,
        adoptRoot: (_next: unknown) =>
            function (
                this: TExoDomApi,
                machine: TExoDomMachine,
                parent: Element,
                params?: unknown
            ): TExoDomNodeApi & TExoNode<TExoDomMark> {
                const schema = exoHydrateSchemaOf(machine, this);
                const root = requireExoElement(parent.firstElementChild, 'a top-level instance');
                let child: TExoDomChild | null = null;
                const ambient = exoTeardownScope(() => {
                    child = buildAdoptedExoChild(schema, root, machine, 0, null, params);
                });
                const adopted = child as unknown as TExoDomChild;
                exoOnTeardown(adopted, ambient);
                return adopted as unknown as TExoDomNodeApi & TExoNode<TExoDomMark>;
            },
        hydrate: (_next: unknown) =>
            function (
                this: TExoDomApi & TExoHydrationApi,
                machine: TExoDomMachine,
                parent: Element,
                params?: unknown
            ): () => void {
                return mountExoDomNode(
                    this.adoptRoot(machine as never, parent, params),
                    parent,
                    this
                );
            },
    }) as unknown as TBase & TExoHydrationApi;
};

// Structural rather than "the class plus the pack", so somebody else's hydration satisfies it too.
// `extends` and not `&` because an interface may not be an intersection, and an interface is what a
// `this` type requires.
export interface TExoHydrateBackend extends TExoDomApi, TExoDomSurface {
    hydrate(
        machine:
            | TExoMachine<this & TExoDomInstanceRecord>
            | TExoMachine<this & TExoDomInstanceRecord>,
        parent: Element,
        params?: unknown
    ): () => void;
}
