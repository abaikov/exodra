import { warnExoFormGrowth } from '@exodra/core';
import type { TExoMachine } from '@exodra/core';
import { compileExoStrSchema } from './compileExoStrSchema';
import { createExoStrSchema } from './createExoStrSchema';
import type { TExoStrJsonDeclaration } from './types/TExoStrJsonDeclaration';
import type { TExoStrApi } from '../node/types/TExoStrApi';
import type { TExoStrSchema } from './types/TExoStrSchema';

export function exoStrSchemaOf(machine: TExoMachine<never>, backend: TExoStrApi): TExoStrSchema {
    const forms = machine.forms;
    const at = backend.backendType;
    const held = forms[at];
    if (held !== undefined) return held as TExoStrSchema;
    warnExoFormGrowth(machine);
    const json = machine.declaration.jsonDeclarations?.string;
    const made =
        json === undefined
            ? compileExoStrSchema(machine.declaration, backend)
            : createExoStrSchema(json as TExoStrJsonDeclaration, backend);
    forms[at] = made;
    return made;
}
