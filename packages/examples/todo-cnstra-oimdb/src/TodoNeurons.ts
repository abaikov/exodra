import { withCNSGlobal } from '@cnstra/core';
import { TodoUiAxon } from './TodoUiAxon';
import type { TTodoDb } from './types/TTodoDb';

const { neuron } = withCNSGlobal<TTodoDb>();
const {
    newTodoEntered,
    toggleClicked,
    destroyClicked,
    titleEdited,
    clearCompletedClicked,
    filterLinkClicked,
} = TodoUiAxon;

const todoNeuron = neuron({}).bind(
    { newTodoEntered, toggleClicked, destroyClicked, titleEdited, clearCompletedClicked },
    {
        newTodoEntered: ({ title }, _axon, { global }) => {
            const id = global.nextTodoId();
            global.todos.upsertEntityByKey(id, { id, title, done: false });
        },
        toggleClicked: ({ id, done }, _axon, { global }) => {
            global.todos.updateEntityByKey(id, { done });
        },
        destroyClicked: ({ id }, _axon, { global }) => {
            global.todos.deleteEntityByKey(id);
        },
        titleEdited: ({ id, title }, _axon, { global }) => {
            const trimmed = title.trim();
            if (trimmed === '') global.todos.deleteEntityByKey(id);
            else global.todos.updateEntityByKey(id, { title: trimmed });
        },
        clearCompletedClicked: (_payload, _axon, { global }) => {
            for (const todo of global.todosByDone.getEntitiesByKey('done')) {
                global.todos.deleteEntityByKey(todo.id);
            }
        },
    }
);

const todoFilterNeuron = neuron({}).bind(
    { filterLinkClicked },
    {
        filterLinkClicked: ({ filter }, _axon, { global }) => {
            global.filter.upsertEntity({ filter });
        },
    }
);

export const TodoNeurons = [todoNeuron, todoFilterNeuron];
