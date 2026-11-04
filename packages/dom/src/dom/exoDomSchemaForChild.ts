import type { TExoMachine } from '@exodra/core';
import { refuseExoUncompiledDeclaration } from './refuseExoUncompiledDeclaration';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomSchema } from './types/TExoDomSchema';

const compileThroughPack = (machine: TExoMachine<never>, backend: TExoDomApi): TExoDomSchema => {
    const pack = (backend as Partial<{ schema(m: TExoMachine<never>): TExoDomSchema }>).schema;
    if (pack === undefined) refuseExoUncompiledDeclaration();
    return pack.call(backend, machine);
};

export function exoDomSchemaForChild(
    machine: TExoMachine<never>,
    backend: TExoDomApi
): TExoDomSchema {
    const held = machine.forms[backend.backendType];
    if (held !== undefined) return held as TExoDomSchema;
    return compileThroughPack(machine, backend);
}
