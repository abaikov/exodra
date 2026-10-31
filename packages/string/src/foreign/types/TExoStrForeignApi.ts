import type { TExoNode } from '@exodra/core';
import type { TExoStrMark } from '../../schema/types/TExoStrMark';

export interface TExoStrForeignApi {
    foreign(t: { createStr(): TExoNode<TExoStrMark> }): TExoNode<TExoStrMark>;
}
