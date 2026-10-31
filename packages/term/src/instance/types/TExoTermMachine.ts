import type { TExoMachine } from '@exodra/core';
import type { TExoTermNode } from '../EXO_TERM_NODE_VOCABULARY';

// ONE name. This package's acceptance test rests on it: a component typed against the surface every
// published example names satisfies it with NO CAST, because an exonode parameter is contravariant.
// `src/doc/` is the alarm if that stops.
export type TExoTermMachine = TExoMachine<TExoTermNode>;
