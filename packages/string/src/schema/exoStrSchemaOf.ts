import { warnExoFormGrowth } from '@exodra/core';
import type { TExoMachine } from '@exodra/core';
import { compileExoStrSchema } from './compileExoStrSchema';
import type { TExoStrApi } from '../node/types/TExoStrApi';
import type { TExoStrSchema } from './types/TExoStrSchema';

export function exoStrSchemaOf(machine: TExoMachine<never>, backend: TExoStrApi): TExoStrSchema {
    const forms = machine.forms;
    const at = backend.backendType;
    const held = forms[at];
    if (held !== undefined) return held as TExoStrSchema;
    warnExoFormGrowth(machine);
    const made = compileExoStrSchema(machine.declaration, backend);
    forms[at] = made;
    return made;
}
