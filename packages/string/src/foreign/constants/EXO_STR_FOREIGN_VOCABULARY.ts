import { exoVocabulary } from '@exodra/core';
import type { TExoNode } from '@exodra/core';
import type { TExoStrMark } from '../../schema/types/TExoStrMark';
import type { TExoStrForeignApi } from '../types/TExoStrForeignApi';

const EXO_STR_FOREIGN_METHODS: TExoStrForeignApi = {
    foreign(t: { createStr(): TExoNode<TExoStrMark> }): TExoNode<TExoStrMark> {
        return t.createStr();
    },
};

export const EXO_STR_FOREIGN_VOCABULARY = /*#__PURE__*/ exoVocabulary(EXO_STR_FOREIGN_METHODS);
