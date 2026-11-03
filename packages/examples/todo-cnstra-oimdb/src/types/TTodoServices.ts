import type { TTodoCns } from './TTodoCns';
import type { TTodoDb } from './TTodoDb';
import type { TTodoOimdb } from './TTodoOimdb';

export type TTodoServices = {
    readonly oimdb: TTodoOimdb;
    readonly todoDb: TTodoDb;
    readonly cns: TTodoCns;
    readonly todoRowCell: number;
};
