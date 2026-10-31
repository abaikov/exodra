import { exoVocabulary } from '@exodra/core';
import type { TExoNode } from '@exodra/core';
import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMark } from '../../dom/types/TExoDomMark';
import type { TExoDomForeignApi } from '../types/TExoDomForeignApi';

const EXO_DOM_FOREIGN_METHODS: TExoDomForeignApi = {
    foreign(
        this: TExoDomNode,
        t: { createDom(c: TExoDomNode): TExoNode<TExoDomMark> }
    ): TExoNode<TExoDomMark> {
        return t.createDom(this);
    },
};

export const EXO_DOM_FOREIGN_VOCABULARY = /*#__PURE__*/ exoVocabulary(EXO_DOM_FOREIGN_METHODS);
