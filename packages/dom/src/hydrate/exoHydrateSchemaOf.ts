import type { TExoMachine } from '@exodra/core';
import { compileExoHydrateSchema } from './compileExoHydrateSchema';
import { exoDomSchemaOf } from '../dom/exoDomSchemaOf';
import type { TExoDomApi } from '../dom/types/TExoDomApi';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';

export function exoHydrateSchemaOf(
    machine: TExoMachine<never>,
    backend: TExoDomApi
): TExoHydrateSchema {
    const dom = exoDomSchemaOf(machine, backend);
    const held = dom.hydrateSchema;
    if (held !== null) return held as TExoHydrateSchema;
    const made = compileExoHydrateSchema(machine.declaration, backend, dom);
    dom.hydrateSchema = made;
    return made;
}
