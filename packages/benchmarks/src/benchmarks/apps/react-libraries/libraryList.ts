import { createElement as h } from 'react';
import { create } from 'zustand';
import { QueryClient, QueryClientProvider, notifyManager, useQuery } from '@tanstack/react-query';

export const LIBRARY_LIST_ROWS = 200;
export const LIBRARY_LIST_WRITES_PER_ROUND = 40;

export type TLibraryListApp = {
    readonly app: unknown;
    advance(round: number): void;
};

export function createLibraryListApp(): TLibraryListApp {
    notifyManager.setScheduler((run) => run());
    const useCounts = create(() => ({
        counts: Array.from({ length: LIBRARY_LIST_ROWS }, (_, at) => at),
    }));
    const client = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity, retry: false } },
    });
    for (let at = 0; at < LIBRARY_LIST_ROWS; at++) client.setQueryData(['label', at], `item ${at}`);

    function Row({ at }: { at: number }) {
        const count = useCounts((state) => state.counts[at]);
        const { data } = useQuery({ queryKey: ['label', at], queryFn: () => `item ${at}` });
        return h('li', { className: 'row' }, h('span', null, data), h('b', null, count));
    }

    function List() {
        const rows = [];
        for (let at = 0; at < LIBRARY_LIST_ROWS; at++) rows.push(h(Row, { key: at, at }));
        return h('ul', { className: 'rows' }, rows);
    }

    return {
        app: h(QueryClientProvider, { client }, h(List)),
        advance(round) {
            const first = (round * LIBRARY_LIST_WRITES_PER_ROUND) % LIBRARY_LIST_ROWS;
            useCounts.setState((state) => {
                const counts = state.counts.slice();
                for (let k = 0; k < LIBRARY_LIST_WRITES_PER_ROUND; k++)
                    counts[(first + k) % LIBRARY_LIST_ROWS]++;
                return { counts };
            });
            for (let k = 0; k < LIBRARY_LIST_WRITES_PER_ROUND; k++) {
                const at = (first + k) % LIBRARY_LIST_ROWS;
                client.setQueryData(['label', at], `item ${at} · ${round}`);
            }
        },
    };
}
