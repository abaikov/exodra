import {
    OIMDB,
    OIMSlotContentPositionalArrayBucketService,
    createOIMSingleSlotService,
    createOIMSlotCollectionIndexService,
    createOIMSlotCollectionService,
    createOIMSlotContentEntityService,
} from '@oimdb/core';
import type { TTodo } from './types/TTodo';
import type { TTodoFilter } from './types/TTodoFilter';
import type { TTodoSlot } from './types/TTodoSlot';

export function createTodoDb() {
    const db = new OIMDB();

    const todoService = createOIMSlotCollectionService({
        slotContentService: createOIMSlotContentEntityService<TTodo, string>(),
    });
    const todos = todoService.createStoreSlot(db);

    const todoOrderService = createOIMSlotCollectionService({
        slotContentService: new OIMSlotContentPositionalArrayBucketService<TTodoSlot>(),
    });
    const todoOrders = todoOrderService.createStoreSlot(db);

    const todoStatusService = createOIMSlotCollectionIndexService({
        entityService: todoService,
        keyOf: (todo: TTodo) => (todo.done ? 'done' : 'active'),
        columns: ['done'],
    });
    const todoStatuses = todoStatusService.createIndexStoreSlot(todos);

    const filterService = createOIMSingleSlotService({
        slotContentService: createOIMSlotContentEntityService<{ filter: TTodoFilter }>(),
    });
    const filters = filterService.createStoreSlot(db);
    filterService.writeSingleSlotContent(filters, { filter: 'all' });

    let lastTodoId = 0;

    return {
        db,
        todoService,
        todos,
        todoOrderService,
        allTodos: todoOrderService.holdSlotByKey(todoOrders, 'all'),
        todoStatusService,
        activeTodos: todoStatusService.holdSlotByKey(todoStatuses, 'active'),
        doneTodos: todoStatusService.holdSlotByKey(todoStatuses, 'done'),
        filterService,
        filter: filterService.holdSingleSlot(filters),
        nextTodoId: (): string => String(++lastTodoId),
    };
}
