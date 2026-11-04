import type { TTodoCns } from './TTodoCns';
import type { TTodoDb } from './TTodoDb';
import type { OIMExodraPlugin } from '@oimdb/exodra';

export type TTodoServices = {
    readonly todoDb: TTodoDb;
    readonly cns: TTodoCns;
    readonly exodraPlugin: OIMExodraPlugin;
};
