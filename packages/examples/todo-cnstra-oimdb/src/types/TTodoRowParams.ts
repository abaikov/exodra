import type { TTodoSlot } from './TTodoSlot';

export type TTodoRowParams = {
    readonly slot: TTodoSlot;
    readonly editing: boolean;
};
