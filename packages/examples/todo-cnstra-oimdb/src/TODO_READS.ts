import { todoDb } from './todoDb';
import type { TTodoFilter } from './types/TTodoFilter';
import type { TTodoSlot } from './types/TTodoSlot';

const { todoOrderService, allTodos, todoStatusService, activeTodos, doneTodos, filter } = todoDb;

export const TODO_READS = {
    countSlots: [activeTodos, doneTodos],
    filterSlots: [filter],
    visibleSlots: [allTodos, activeTodos, doneTodos, filter],
    counts: () => ({
        active: todoStatusService.slotContentService.getBucketMemberSlotCount(activeTodos),
        done: todoStatusService.slotContentService.getBucketMemberSlotCount(doneTodos),
    }),
    filter: (): TTodoFilter => filter.entity?.filter ?? 'all',
    visibleTodoSlots: (): TTodoSlot[] => {
        const shown = filter.entity?.filter ?? 'all';
        const slots: TTodoSlot[] = [];
        for (const slot of todoOrderService.slotContentService.getBucketMemberSlots(allTodos)) {
            const todo = slot.entity;
            if (todo === undefined) continue;
            if (shown === 'all' || todo.done === (shown === 'completed')) slots.push(slot);
        }
        return slots;
    },
};
