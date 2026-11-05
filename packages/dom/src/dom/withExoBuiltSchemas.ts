import { composeExoPlugins } from '@exodra/core';
import type { TExoMachine, TExoNode } from '@exodra/core';
import { exoDomJsonSchemaOf } from './exoDomJsonSchemaOf';
import { exoDomSchemaForChild } from './exoDomSchemaForChild';
import { refuseExoUncompiledDeclaration } from './refuseExoUncompiledDeclaration';
import type { TExoDomSchema } from './types/TExoDomSchema';
import { buildExoDomRoot } from './buildExoDomRoot';
import { mountExoDomNode } from './mountExoDomNode';
import { createExoUnarmedChild } from './createExoUnarmedChild';
import type { TExoDomNodeApi } from './EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMachine } from './types/TExoDomMachine';
import type { TExoDomMark } from './types/TExoDomMark';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomInstanceRecord } from './types/TExoDomInstanceRecord';

// Its own interface and not an `Omit` of `TExoCompilerApi`: `Omit` binds the `this` in `render` to that type.
export interface TExoBuiltSchemasApi {
    schema(machine: TExoMachine<never>): TExoDomSchema;
    render<TParams>(
        machine: TExoMachine<this & TExoDomInstanceRecord, unknown, TParams>,
        parent: Element,
        params?: TParams
    ): () => void;
    mountRoot(node: TExoNode<TExoDomMark>, parent: Element): () => void;
    createExoNode<TParams>(
        machine: TExoMachine<this & TExoDomInstanceRecord, unknown, TParams>
    ): TExoDomNodeApi & TExoNode<TExoDomMark>;
}

// `render` for a page whose declarations a build compiled: each schema is built from the JSON form
// on its declaration, and nothing this imports reaches `compileExoDomSchema`.
export const withExoBuiltSchemas = <TBase extends TExoDomApi>(
    base: TBase
): TBase & TExoBuiltSchemasApi =>
    composeExoPlugins(base, {
        // What `c.one`, `c.list` and `c.build` reach through `exoDomSchemaForChild` too.
        schema: (next: unknown) =>
            function (this: TExoDomApi, machine: TExoMachine<never>): TExoDomSchema {
                const built = exoDomJsonSchemaOf(machine, this);
                if (built !== null) return built;
                if (typeof next !== 'function') refuseExoUncompiledDeclaration();
                return (next as (m: TExoMachine<never>) => TExoDomSchema).call(this, machine);
            },
        createExoNode: (_next: unknown) =>
            function (
                this: TExoDomApi & Partial<TExoDomInstanceRecord>,
                machine: TExoMachine<TExoDomInstanceRecord>
            ) {
                const backend = ((this.schema as TExoDomSchema | undefined)?.backend ??
                    this) as TExoDomApi;
                return createExoUnarmedChild(
                    exoDomSchemaForChild(machine as unknown as TExoMachine<never>, backend),
                    machine as unknown as TExoDomMachine,
                    this.context ?? null
                ) as unknown as TExoDomNodeApi & TExoNode<TExoDomMark>;
            },
        mountRoot: (_next: unknown) =>
            function (this: TExoDomApi, node: TExoNode<TExoDomMark>, parent: Element) {
                return mountExoDomNode(node, parent, this);
            },
        render: (_next: unknown) =>
            function (
                this: TExoDomApi & TExoBuiltSchemasApi,
                machine: TExoMachine<TExoDomInstanceRecord>,
                parent: Element,
                params?: unknown
            ) {
                return this.mountRoot(
                    buildExoDomRoot(this.createExoNode(machine as never), params),
                    parent
                );
            },
    }) as TBase & TExoBuiltSchemasApi;
