import { CNS } from '@cnstra/core';
import { TODO_NEURONS } from './TODO_NEURONS';
import { todoDb } from './todoDb';

export const todoCns = new CNS(TODO_NEURONS, undefined, todoDb);

todoCns.addDrainListener(() => todoDb.db.flush());
