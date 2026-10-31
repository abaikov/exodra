import type { TExoMachine } from '@exodra/core';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';

// ONE name, because there is one component shape: a schema and a machine. The two aliases that used
// to sit here — a wired one and a machine one, joined by a union — described the same object through
// a field `@exodra/core` no longer has.
export type TExoDomMachine = TExoMachine<TExoDomNode>;
