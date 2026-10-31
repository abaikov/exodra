import type { TExoLive } from '@exodra/core';

export interface TExoComputedLive<TWiring> extends TExoLive {
    readonly instance: TWiring;
}
