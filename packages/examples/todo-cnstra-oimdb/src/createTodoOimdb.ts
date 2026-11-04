import {
    OIMBucketCommands,
    OIMDB,
    OIMPositionalArrayBucketContentService,
    createOIMEntityContentService,
    createOIMEntitySlotCollectionStoreAggregate,
    createOIMSingleSlotStoreAggregate,
    createOIMSlotCollectionIndexStoreAggregate,
} from '@oimdb/core';
import type { TTodo } from './types/TTodo';
import type { TTodoFilter } from './types/TTodoFilter';
import type { TTodoSlot } from './types/TTodoSlot';

function recordedOrder(): OIMPositionalArrayBucketContentService<TTodoSlot, string> {
    return new OIMPositionalArrayBucketContentService<TTodoSlot, string>({
        bucketCommands: new OIMBucketCommands({}),
    });
}

function createTodoSchema(db: OIMDB) {
    let lastTodoId = 0;
    const todos = createOIMEntitySlotCollectionStoreAggregate<TTodo>(db);
    const byDoneOrder = recordedOrder();
    const todosByDone = createOIMSlotCollectionIndexStoreAggregate(todos, {
        selectKey: (todo: TTodo): 'done' | 'active' => (todo.done ? 'done' : 'active'),
        slotContentService: byDoneOrder,
    });
    return {
        todos,
        todosInOrder: createOIMSlotCollectionIndexStoreAggregate(todos, {
            selectKey: (): 'all' => 'all',
            slotContentService: recordedOrder(),
        }),
        todosByDone,
        filter: createOIMSingleSlotStoreAggregate(db, {
            slotContentService: createOIMEntityContentService<{ filter: TTodoFilter }>(),
        }),
        nextTodoId: (): string => String(++lastTodoId),
        putInCreatedOrder(slot: TTodoSlot): void {
            const id = Number(slot.entity?.id);
            const bucket = todosByDone.getSlotByKey(slot.entity?.done ? 'done' : 'active');
            const from = byDoneOrder.getBucketMemberSlotPosition(bucket, slot);
            let to = 0;
            for (const member of bucket.getBucketMemberSlots()) {
                if (member !== slot && Number(member.entity?.id) < id) to++;
            }
            if (from !== -1 && from !== to)
                byDoneOrder.moveBucketMemberSlotToPosition(bucket, from, to);
        },
    };
}

export function createTodoOimdb() {
    return new OIMDB({ createSchemas: (db) => ({ todos: createTodoSchema(db) }) });
}
