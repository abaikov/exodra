import type { TExoMachine } from '@exodra/core';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';

// ONE name: a component is a schema and a machine, and the wired form is that same machine with its
// prepared transition. What must hold with no cast is that a component written once satisfies this
// AND `TExoDomMachine`, or one component cannot be served AND hydrated.
export type TExoStrMachine = TExoMachine<TExoStrNode>;
