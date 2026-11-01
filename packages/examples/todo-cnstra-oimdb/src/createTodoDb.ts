import * as oimdb from '@oimdb/core/oimdb';
import type { TTodo } from './types/TTodo';
import type { TTodoFilter } from './types/TTodoFilter';

export function createTodoDb() {
    const todos = oimdb.entities<TTodo>();
    let lastTodoId = 0;
    return {
        todos,
        todosInOrder: oimdb.index(todos, { keyOf: () => 'all', columns: [] }),
        todosByDone: oimdb.index(todos, {
            keyOf: (todo) => (todo.done ? 'done' : 'active'),
            columns: ['done'],
        }),
        filter: oimdb.entity<{ filter: TTodoFilter }>(),
        nextTodoId: (): string => String(++lastTodoId),
    };
}
