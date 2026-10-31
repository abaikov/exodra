import type { TExoNode } from '@exodra/core';
import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMark } from '../../dom/types/TExoDomMark';

export interface TExoDomForeignApi {
    foreign(t: { createDom(c: TExoDomNode): TExoNode<TExoDomMark> }): TExoNode<TExoDomMark>;
}
