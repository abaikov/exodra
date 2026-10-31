import { composeExoPlugins } from '@exodra/core';
import type { TExoWritersApi } from '../../backend/types/TExoWritersApi';
import { createExoPropertyWriters } from './factories/createExoPropertyWriters';

// ATTRIBUTES fall through to `EXO_SHIPPED_WRITERS` by module import; TEXT is delegated to `next`,
// which is what this line passes down — until it did, composing this over `withExoReclaimingText`
// silently threw the reclaiming writer away while the other order kept it.
export const withExoPropertyWriters = <TBase extends object>(
    base: TBase,
    takesOver?: (name: string, proto: Element) => boolean
): TBase =>
    composeExoPlugins(base, {
        writers: (next: TExoWritersApi) =>
            takesOver === undefined
                ? createExoPropertyWriters(next)
                : createExoPropertyWriters(next, takesOver),
    });
