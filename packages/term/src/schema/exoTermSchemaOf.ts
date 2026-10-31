import { warnExoFormGrowth } from '@exodra/core';
import type { TExoMachine } from '@exodra/core';
import { compileExoTermSchema } from './compileExoTermSchema';
import type { TExoTermApi } from '../backend/types/TExoTermApi';
import type { TExoTermSchema } from './types/TExoTermSchema';

export function exoTermSchemaOf(machine: TExoMachine<never>, backend: TExoTermApi): TExoTermSchema {
    const forms = machine.forms;
    const at = backend.backendType;
    const held = forms[at];
    if (held !== undefined) return held as TExoTermSchema;
    warnExoFormGrowth(machine);
    const made = compileExoTermSchema(machine.declaration, backend);
    forms[at] = made;
    return made;
}
