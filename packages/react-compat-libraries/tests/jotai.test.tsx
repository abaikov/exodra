import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { Provider, atom, createStore, useAtomValue, useSetAtom } from 'jotai';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';

describe('jotai', () => {
    it('propagates an atom write to a reader and a derived atom', async () => {
        const countAtom = atom(1);
        const doubledAtom = atom((get) => get(countAtom) * 2);
        const store = createStore();

        function Reader() {
            return (
                <p>
                    <span className="count">{useAtomValue(countAtom)}</span>
                    <span className="doubled">{useAtomValue(doubledAtom)}</span>
                </p>
            );
        }

        function Writer() {
            const setCount = useSetAtom(countAtom);
            return <button onClick={() => setCount((value) => value + 1)}>+</button>;
        }

        const { container, unmount } = await mountExoReactTree(
            <Provider store={store}>
                <Reader />
                <Writer />
            </Provider>
        );
        const text = (selector: string) => container.querySelector(selector)?.textContent;
        expect(text('.count')).toBe('1');
        expect(text('.doubled')).toBe('2');

        await clickExoReactElement(container.querySelector('button'));
        expect(text('.count')).toBe('2');
        expect(text('.doubled')).toBe('4');

        await act(async () => {
            store.set(countAtom, 10);
        });
        expect(text('.doubled')).toBe('20');

        await unmount();
    });
});
