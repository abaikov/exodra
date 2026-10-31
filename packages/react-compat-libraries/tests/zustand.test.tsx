import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { create } from 'zustand';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';

describe('zustand', () => {
    it('re-renders a selecting consumer on a store update and skips an unrelated one', async () => {
        const useCounter = create<{ count: number; label: string; increment(): void }>(
            (set) => ({
                count: 0,
                label: 'counter',
                increment: () => set((state) => ({ count: state.count + 1 })),
            })
        );
        let labelRenders = 0;

        function Count() {
            const count = useCounter((state) => state.count);
            const increment = useCounter((state) => state.increment);
            return <button onClick={increment}>{count}</button>;
        }

        function Label() {
            labelRenders++;
            return <span>{useCounter((state) => state.label)}</span>;
        }

        const { container, unmount } = await mountExoReactTree(
            <div>
                <Count />
                <Label />
            </div>
        );
        const button = container.querySelector('button');
        expect(button?.textContent).toBe('0');
        const rendersAfterMount = labelRenders;

        await clickExoReactElement(button);
        expect(container.querySelector('button')?.textContent).toBe('1');

        await act(async () => {
            useCounter.setState({ count: 10 });
        });
        expect(container.querySelector('button')?.textContent).toBe('10');
        expect(container.querySelector('button')).toBe(button);
        expect(labelRenders).toBe(rendersAfterMount);

        await unmount();
    });
});
