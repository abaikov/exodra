import type { RefObject } from 'react';
import type { TExoNode } from '@exodra/core';
import type { TExoDomMark } from '@exodra/dom';

export type TExoMountHandle<TElement extends Element> = {
    readonly ref: RefObject<TElement | null>;
    readonly node: RefObject<TExoNode<TExoDomMark> | null>;
};
