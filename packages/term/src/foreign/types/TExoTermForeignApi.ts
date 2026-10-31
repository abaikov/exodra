import type { TExoNode } from '@exodra/core';
import type { TExoTermMark } from '../../rendering/types/TExoTermMark';

export interface TExoTermForeignApi {
    foreign(t: { createTerm(): TExoNode<TExoTermMark> }): TExoNode<TExoTermMark>;
}
