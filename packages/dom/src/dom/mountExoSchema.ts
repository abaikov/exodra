import type { TExoMachine } from '@exodra/core';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomMachine } from './types/TExoDomMachine';
import type { TExoDomInstanceRecord } from './types/TExoDomInstanceRecord';
import type { TExoDomSchema } from './types/TExoDomSchema';
import { buildExoDomRoot } from './buildExoDomRoot';
import { createExoUnarmedChild } from './createExoUnarmedChild';
import { mountExoDomNode } from './mountExoDomNode';

/**
 * RENDER A SCHEMA SOMEBODY ELSE PRODUCED — `ExoDomBackend.render`'s body with the compile taken
 * out, and the entry a page uses when a BUILD compiled its schemas.
 *
 * `render` is the same act with one line in front of it: look the schema up on the declaration,
 * compiling it if nothing has. That line is the only reason a page links the compiler, so the rest
 * of it lives here, where nothing reaches `compileExoDomSchema` — which is a GRAPH claim and is
 * checked as one by `check:json-render-links-no-compiler`.
 *
 * The extra call costs one frame per MOUNTED ROOT. A root mount is not a hot path; a schema
 * compile used to happen on the same line.
 */
// Generic over the component's exonode for the reason `render` is generic over `this`: a flat
// parameter refuses a wire that names a method a PACK added, because a component is contravariant
// in the exonode its wire is written against.
export function mountExoSchema<TNode extends TExoDomInstanceRecord>(
    schema: TExoDomSchema,
    machine: TExoMachine<TNode> | TExoMachine<TNode>,
    parent: Element,
    backend: TExoDomApi,
    params?: unknown
): () => void {
    return mountExoDomNode(
        buildExoDomRoot(
            createExoUnarmedChild(schema, machine as unknown as TExoDomMachine, null) as never,
            params
        ),
        parent,
        backend
    );
}
