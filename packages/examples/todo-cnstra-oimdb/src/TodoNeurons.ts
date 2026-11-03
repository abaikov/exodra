import { withCNSGlobal } from '@cnstra/core';
import { TodoUiAxon } from './TodoUiAxon';
import type { TTodoDb } from './types/TTodoDb';

const { neuron } = withCNSGlobal<TTodoDb>();
const {
    newTodoEntered,
    toggleClicked,
    toggleAllClicked,
    destroyClicked,
    titleEdited,
    clearCompletedClicked,
    filterLinkClicked,
} = TodoUiAxon;

const todoNeuron = neuron({}).bind(
    {
        newTodoEntered,
        toggleClicked,
        toggleAllClicked,
        destroyClicked,
        titleEdited,
        clearCompletedClicked,
    },
    {
        newTodoEntered: ({ title }, _axon, { global }) => {
            const id = global.nextTodoId();
            global.todos.writeSlotContentByKey(id, { id, title, done: false });
        },
        toggleClicked: ({ id, done }, _axon, { global }) => {
            const slot = global.todos.getSlotByKey(id);
            slot.updateEntity({ done });
            global.putInCreatedOrder(slot);
        },
        toggleAllClicked: ({ done }, _axon, { global }) => {
            for (const todo of global.todosByDone.getEntitiesByKey(done ? 'active' : 'done')) {
                const slot = global.todos.getSlotByKey(todo.id);
                slot.updateEntity({ done });
                global.putInCreatedOrder(slot);
            }
        },
        destroyClicked: ({ id }, _axon, { global }) => {
            global.todos.getSlotByKey(id).clearSlotContent();
        },
        titleEdited: ({ id, title }, _axon, { global }) => {
            const trimmed = title.trim();
            if (trimmed === '') global.todos.getSlotByKey(id).clearSlotContent();
            else global.todos.getSlotByKey(id).updateEntity({ title: trimmed });
        },
        clearCompletedClicked: (_payload, _axon, { global }) => {
            for (const todo of global.todosByDone.getEntitiesByKey('done')) {
                global.todos.getSlotByKey(todo.id).clearSlotContent();
            }
        },
    }
);

const todoFilterNeuron = neuron({}).bind(
    { filterLinkClicked },
    {
        filterLinkClicked: ({ filter }, _axon, { global }) => {
            global.filter.writeSingleSlotContent({ filter });
        },
    }
);

export const TodoNeurons = [todoNeuron, todoFilterNeuron];
