import { warnExoFormGrowth } from '@exodra/core';
import type { TExoMachine } from '@exodra/core';
import { compileExoDomSchema } from './compileExoDomSchema';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomSchema } from './types/TExoDomSchema';

export function exoDomSchemaOf(machine: TExoMachine<never>, backend: TExoDomApi): TExoDomSchema {
    const forms = machine.forms;
    const at = backend.backendType;
    const held = forms[at];
    if (held !== undefined) return held as TExoDomSchema;
    warnExoFormGrowth(machine);
    const made = compileExoDomSchema(machine.declaration, backend);
    forms[at] = made;
    return made;
}
