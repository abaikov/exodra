import type { TExoMachine } from '@exodra/core';
import { createExoDomSchema } from './createExoDomSchema';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomJsonDeclaration } from './types/TExoDomJsonDeclaration';
import type { TExoDomSchema } from './types/TExoDomSchema';

export function exoDomJsonSchemaOf(
    machine: TExoMachine<never>,
    backend: TExoDomApi
): TExoDomSchema | null {
    const json = machine.declaration.jsonDeclarations?.dom;
    if (json === undefined) return null;
    const made = createExoDomSchema(json as TExoDomJsonDeclaration, backend);
    machine.forms[backend.backendType] = made;
    return made;
}
