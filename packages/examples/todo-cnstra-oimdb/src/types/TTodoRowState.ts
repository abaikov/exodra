import type { TTodoSlot } from './TTodoSlot';

export type TTodoRowState = {
    slot: TTodoSlot;
    editing: boolean;
    done: boolean;
};
