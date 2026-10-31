import { describe, expect, it } from 'vitest';
import useSWR, { SWRConfig } from 'swr';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

describe('swr', () => {
    it('resolves a key into the DOM and mutate() revalidates it', async () => {
        let calls = 0;

        function Value() {
            const { data, mutate } = useSWR('value', async () => `value ${++calls}`);
            return (
                <div>
                    <output>{data ?? 'loading'}</output>
                    <button onClick={() => void mutate()}>revalidate</button>
                </div>
            );
        }

        const { container, unmount } = await mountExoReactTree(
            <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
                <Value />
            </SWRConfig>
        );
        const output = () => container.querySelector('output')?.textContent;
        await waitForExoReactCondition(() => output() === 'value 1');

        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(() => output() === 'value 2');
        expect(calls).toBe(2);

        await unmount();
    });
});
