import type { TExoMachine } from '@exodra/core';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomSchema } from './types/TExoDomSchema';

const compileThroughPack = (machine: TExoMachine<never>, backend: TExoDomApi): TExoDomSchema => {
    const pack = (backend as Partial<{ schema(m: TExoMachine<never>): TExoDomSchema }>).schema;
    if (pack === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'exodra: a child was handed as a DECLARATION to a backend that cannot compile ' +
                  'one. Either compose withExoCompiler(new ExoDomBackend()), or hand the child a ' +
                  'schema this backend already holds — which is what a page whose schemas came ' +
                  'off a build does, and why that page links no compiler at all.'
                : 'EXO0099'
        );
    }
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
