import { composeExoPlugins } from '@exodra/core';
import type { TExoMachine, TExoNode } from '@exodra/core';
import { exoDomSchemaOf } from './exoDomSchemaOf';
import { buildExoDomRoot } from './buildExoDomRoot';
import { mountExoDomNode } from './mountExoDomNode';
import type { TExoDomNodeApi } from './EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMachine } from './types/TExoDomMachine';
import type { TExoDomMark } from './types/TExoDomMark';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomInstanceRecord } from './types/TExoDomInstanceRecord';
import type { TExoDomSchema } from './types/TExoDomSchema';

export interface TExoCompilerApi {
    /** COMPILE A DECLARATION NOW, for THIS backend, and hand the schema back. The schema is cached
     *  on the declaration either way, so a render would compile it once anyway — on the FIRST
     *  render, which may be inside a click. Calling this at module load takes that off the clock. */
    schema(machine: TExoMachine<never>): TExoDomSchema;
    /** `this & TExoDomInstanceRecord` and not a flat exonode, for the reason the class's own
     *  `render` was generic over `this`: a component is CONTRAVARIANT in the exonode its wire is
     *  written against, so a flat parameter refuses a wire that names a pack-added `c.keyedList`. */
    render<TParams>(
        machine: TExoMachine<this & TExoDomInstanceRecord, unknown, TParams>,
        parent: Element,
        params?: TParams
    ): () => void;
    buildRoot<TParams>(
        machine: TExoMachine<this & TExoDomInstanceRecord, unknown, TParams>,
        params?: TParams
    ): TExoDomNodeApi & TExoNode<TExoDomMark>;
    mountRoot(node: TExoNode<TExoDomMark>, parent: Element): () => void;
}

/**
 * THE COMPILER, AS A PACK — the composition that lets a backend take DECLARATIONS.
 *
 * A schema and the declaration it came from are two things, and this is the seam between them: a
 * backend renders SCHEMAS (`mountExoSchema`), and turning a declaration into one is a separate act
 * a page may or may not need. Compose this and `render(component, parent)` exists; leave it out and
 * the page has no compiler in it at all — not merely unused but ABSENT, because nothing it imports
 * reaches `compileExoDomSchema`, which `check:json-render-links-no-compiler` walks the graph for.
 *
 * WHICH PAGE LEAVES IT OUT: one whose schemas came off a build, which says
 * `createExoDomSchema(declaration, backend)` and then `mountExoSchema(schema, …)`.
 *
 * Hydration needs it beneath, because an adopting schema is derived from the DOM schema and that
 * is the compiler's answer: `withExoHydration(withExoCompiler(new ExoDomBackend()))`.
 */
export const withExoCompiler = <TBase extends TExoDomApi>(base: TBase): TBase & TExoCompilerApi =>
    // MERGED and not assigned, for the reason every other pack is: a later pack naming `render`
    // receives this one as `next` and can wrap it.
    composeExoPlugins(base, {
        schema: (_next: unknown) =>
            function (this: TExoDomApi, machine: TExoMachine<never>) {
                return exoDomSchemaOf(machine, this);
            },
        buildRoot: (_next: unknown) =>
            function (
                this: TExoDomApi,
                machine: TExoMachine<TExoDomInstanceRecord>,
                params?: unknown
            ) {
                return buildExoDomRoot(
                    exoDomSchemaOf(machine, this),
                    machine as unknown as TExoDomMachine,
                    params
                );
            },
        mountRoot: (_next: unknown) =>
            function (this: TExoDomApi, node: TExoNode<TExoDomMark>, parent: Element) {
                return mountExoDomNode(node, parent, this);
            },
        render: (_next: unknown) =>
            function (
                this: TExoDomApi & TExoCompilerApi,
                machine: TExoMachine<TExoDomInstanceRecord>,
                parent: Element,
                params?: unknown
            ) {
                return this.mountRoot(this.buildRoot(machine as never, params), parent);
            },
    }) as TBase & TExoCompilerApi;
