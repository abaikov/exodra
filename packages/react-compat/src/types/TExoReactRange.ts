import type { TExoChildList } from '@exodra/dom';
import type { TExoDomRenderNode } from '@exodra/dom';
import type { TExoReactSlot } from './TExoReactSlot';

export type TExoReactRange = {
    readonly list: TExoChildList;
    readonly owner: TExoDomRenderNode;
    readonly component: TExoReactSlot | null;
    readonly parentSlot: TExoReactSlot | null;
    slots: TExoReactSlot[];
    leafCount: number;
    changed: boolean;
};
