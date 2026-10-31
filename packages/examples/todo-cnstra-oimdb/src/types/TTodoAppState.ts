import type { TExoNode } from '@exodra/core';
import type { TExoChildList } from '@exodra/dom';
import type { TTodoSlot } from './TTodoSlot';

export type TTodoAppState = {
    rows: TExoChildList;
    rowsBySlot: WeakMap<TTodoSlot, TExoNode>;
    shown: TTodoSlot[];
    editing: TTodoSlot | null;
};
