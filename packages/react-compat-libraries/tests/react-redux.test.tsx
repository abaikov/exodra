import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';

describe('react-redux', () => {
    it('re-renders a useSelector consumer after a dispatch from inside and outside the tree', async () => {
        const counter = createSlice({
            name: 'counter',
            initialState: { value: 0 },
            reducers: {
                increment: (state) => {
                    state.value += 1;
                },
                set: (state, action: { payload: number }) => {
                    state.value = action.payload;
                },
            },
        });
        const store = configureStore({ reducer: { counter: counter.reducer } });
        type TState = ReturnType<typeof store.getState>;

        function Counter() {
            const value = useSelector((state: TState) => state.counter.value);
            const dispatch = useDispatch();
            return <button onClick={() => dispatch(counter.actions.increment())}>{value}</button>;
        }

        const { container, unmount } = await mountExoReactTree(
            <Provider store={store}>
                <Counter />
            </Provider>
        );
        expect(container.querySelector('button')?.textContent).toBe('0');

        await clickExoReactElement(container.querySelector('button'));
        expect(container.querySelector('button')?.textContent).toBe('1');

        await act(async () => {
            store.dispatch(counter.actions.set(42));
        });
        expect(container.querySelector('button')?.textContent).toBe('42');

        await unmount();
    });
});
