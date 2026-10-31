import { exoVocabulary } from '@exodra/core';
import type { TExoNode } from '@exodra/core';
import type { TExoTermMark } from '../../rendering/types/TExoTermMark';
import type { TExoTermForeignApi } from '../types/TExoTermForeignApi';

const EXO_TERM_FOREIGN_METHODS: TExoTermForeignApi = {
    foreign(t: { createTerm(): TExoNode<TExoTermMark> }): TExoNode<TExoTermMark> {
        return t.createTerm();
    },
};

export const EXO_TERM_FOREIGN_VOCABULARY = exoVocabulary(EXO_TERM_FOREIGN_METHODS);
