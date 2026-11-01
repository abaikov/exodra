import { configureStore, createSelector, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

export type Todo = { id: string; title: string; done: boolean };
export type Filter = 'all' | 'active' | 'completed';

let lastTodoId = 0;

const todosSlice = createSlice({
    name: 'todos',
    initialState: { items: [] as Todo[], filter: 'all' as Filter },
    reducers: {
        todoAdded: {
            reducer(state, action: PayloadAction<Todo>) {
                state.items.push(action.payload);
            },
            prepare(title: string) {
                return { payload: { id: String(++lastTodoId), title, done: false } };
            },
        },
        todoToggled(state, action: PayloadAction<{ id: string; done: boolean }>) {
            const todo = state.items.find((t) => t.id === action.payload.id);
            if (todo) todo.done = action.payload.done;
        },
        todoRemoved(state, action: PayloadAction<string>) {
            state.items = state.items.filter((t) => t.id !== action.payload);
        },
        todoEdited(state, action: PayloadAction<{ id: string; title: string }>) {
            const title = action.payload.title.trim();
            if (title === '') {
                state.items = state.items.filter((t) => t.id !== action.payload.id);
                return;
            }
            const todo = state.items.find((t) => t.id === action.payload.id);
            if (todo) todo.title = title;
        },
        completedCleared(state) {
            state.items = state.items.filter((t) => !t.done);
        },
        filterChanged(state, action: PayloadAction<Filter>) {
            state.filter = action.payload;
        },
    },
});

export const { todoAdded, todoToggled, todoRemoved, todoEdited, completedCleared, filterChanged } =
    todosSlice.actions;

export const store = configureStore({ reducer: { todos: todosSlice.reducer } });

export type RootState = ReturnType<typeof store.getState>;
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();

const selectItems = (state: RootState) => state.todos.items;
export const selectFilter = (state: RootState) => state.todos.filter;

export const selectVisibleTodos = createSelector([selectItems, selectFilter], (items, filter) =>
    filter === 'all' ? items : items.filter((t) => t.done === (filter === 'completed'))
);

export const selectCounts = createSelector([selectItems], (items) => {
    const done = items.filter((t) => t.done).length;
    return { active: items.length - done, done };
});
