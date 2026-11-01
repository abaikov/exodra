import { CNS } from '@cnstra/core';
import * as oimdb from '@oimdb/core/oimdb';
import { TodoNeurons } from './TodoNeurons';
import type { TTodoDb } from './types/TTodoDb';

export function createTodoCns(db: TTodoDb) {
    const cns = new CNS(TodoNeurons, undefined, db);
    cns.addDrainListener(() => oimdb.getInstance().flush());
    return cns;
}
