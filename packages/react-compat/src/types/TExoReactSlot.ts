import type { TExoDomMark } from '@exodra/dom';
import type { TExoNode } from '@exodra/core';
import type { TExoReactRange } from './TExoReactRange';

export type TExoReactSlot = {
    readonly kind: 'host' | 'text' | 'component' | 'portal';
    readonly type: unknown;
    readonly key: string;
    props: unknown;
    ref: unknown;
    node: TExoNode<TExoDomMark> | null;
    text: Text | null;
    range: TExoReactRange | null;
    readonly parentRange: TExoReactRange;
    readonly parentComponent: TExoReactSlot | null;
    readonly depth: number;
    hooks: unknown[];
    consumers: Set<TExoReactSlot> | null;
    dirty: boolean;
    alive: boolean;
    pass: number;
};
