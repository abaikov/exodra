import { cnsCollateral } from '@cnstra/core';
import type { TTodoFilter } from './types/TTodoFilter';

export const TODO_SIGNALS = {
    addTodo: cnsCollateral<{ title: string }>(),
    toggleTodo: cnsCollateral<{ id: string; done: boolean }>(),
    removeTodo: cnsCollateral<{ id: string }>(),
    editTodoTitle: cnsCollateral<{ id: string; title: string }>(),
    clearCompletedTodos: cnsCollateral(),
    showTodoFilter: cnsCollateral<{ filter: TTodoFilter }>(),
};
