import { withCNSGlobal } from '@cnstra/core';
import { TODO_SIGNALS } from './TODO_SIGNALS';
import type { TTodoDb } from './types/TTodoDb';

const { neuron } = withCNSGlobal<TTodoDb>();
const { addTodo, toggleTodo, removeTodo, editTodoTitle, clearCompletedTodos, showTodoFilter } =
    TODO_SIGNALS;

function removeTodoById(db: TTodoDb, id: string): void {
    const slot = db.todoService.findSlotByKey(db.todos, id);
    if (slot === undefined) return;
    db.todoOrderService.slotContentService.removeBucketMemberSlot(db.allTodos, slot);
    db.todoService.slotContentService.clearSlotContent(slot);
}

const todoNeuron = neuron({}).bind(
    { addTodo, toggleTodo, removeTodo, editTodoTitle, clearCompletedTodos, showTodoFilter },
    {
        addTodo: ({ title }, _axon, { global }) => {
            const id = global.nextTodoId();
            const slot = global.todoService.writeSlotContentByKey(global.todos, id, {
                id,
                title,
                done: false,
            });
            global.todoOrderService.slotContentService.addBucketMemberSlot(global.allTodos, slot);
        },
        toggleTodo: ({ id, done }, _axon, { global }) => {
            const slot = global.todoService.findSlotByKey(global.todos, id);
            if (slot === undefined) return;
            global.todoService.slotContentService.updateEntityColumn(slot, 'done', done);
        },
        removeTodo: ({ id }, _axon, { global }) => {
            removeTodoById(global, id);
        },
        editTodoTitle: ({ id, title }, _axon, { global }) => {
            const trimmed = title.trim();
            if (trimmed === '') {
                removeTodoById(global, id);
                return;
            }
            const slot = global.todoService.findSlotByKey(global.todos, id);
            if (slot === undefined) return;
            global.todoService.slotContentService.updateEntityColumn(slot, 'title', trimmed);
        },
        clearCompletedTodos: (_payload, _axon, { global }) => {
            const ids: string[] = [];
            const doneSlots = global.todoStatusService.slotContentService.getBucketMemberSlots(
                global.doneTodos
            );
            for (const slot of doneSlots) {
                if (slot.entity !== undefined) ids.push(slot.entity.id);
            }
            for (const id of ids) removeTodoById(global, id);
        },
        showTodoFilter: ({ filter }, _axon, { global }) => {
            global.filterService.slotContentService.updateEntityColumn(
                global.filter,
                'filter',
                filter
            );
        },
    }
);

export const TODO_NEURONS = [todoNeuron];
