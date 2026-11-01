import type { TTodoCns } from './TTodoCns';
import type { TTodoSlot } from './TTodoSlot';

export type TTodoRowState = {
    cns: TTodoCns;
    slot: TTodoSlot;
    editing: boolean;
    done: boolean;
};
