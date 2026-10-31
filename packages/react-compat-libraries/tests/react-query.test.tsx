import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

describe('@tanstack/react-query', () => {
    it('resolves a query into the DOM and a refetch replaces it', async () => {
        let calls = 0;
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        function Value() {
            const query = useQuery({
                queryKey: ['value'],
                queryFn: async () => `value ${++calls}`,
            });
            return (
                <div>
                    <output>{query.isPending ? 'loading' : query.data}</output>
                    <button onClick={() => void query.refetch()}>refetch</button>
                </div>
            );
        }

        const { container, unmount } = await mountExoReactTree(
            <QueryClientProvider client={client}>
                <Value />
            </QueryClientProvider>
        );
        const output = () => container.querySelector('output')?.textContent;
        await waitForExoReactCondition(() => output() === 'value 1');

        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(() => output() === 'value 2');
        expect(calls).toBe(2);

        await unmount();
        client.clear();
    });
});
