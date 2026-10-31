import { composeExoPlugins } from '@exodra/core';
import type { TExoWritersApi } from '../../backend/types/TExoWritersApi';
import { createExoReclaimingTextWriters } from './factories/createExoReclaimingTextWriters';

// `withExoDefaults()` is the bundle an ordinary page composes and this pack is in it. What it buys
// and what it destroys when it fires is in `src/plugins/README.md` § exo-reclaiming-text.
export const withExoReclaimingText = <TBase extends object>(base: TBase): TBase =>
    composeExoPlugins(base, {
        writers: (next: TExoWritersApi) => createExoReclaimingTextWriters(next),
    });
