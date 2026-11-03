import { CNS } from '@cnstra/core';
import { TodoNeurons } from './TodoNeurons';
import type { TTodoDb } from './types/TTodoDb';
import type { TTodoOimdb } from './types/TTodoOimdb';

export function createTodoCns(oimdb: TTodoOimdb, todoDb: TTodoDb) {
    const cns = new CNS(TodoNeurons, undefined, todoDb);
    cns.addDrainListener(() => oimdb.flush());
    return cns;
}
