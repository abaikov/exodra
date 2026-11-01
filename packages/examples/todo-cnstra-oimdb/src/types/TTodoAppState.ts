import type { TExoChildList } from '@exodra/dom';
import type { TTodoSlot } from './TTodoSlot';

export type TTodoAppState = {
    rows: TExoChildList;
    shownSlots: TTodoSlot[];
};
