import { create } from 'zustand';
import { QueryClient, QueryClientProvider, notifyManager, useQuery } from '@tanstack/react-query';

export const LIBRARY_LIST_ROWS = 200;
export const LIBRARY_LIST_WRITES_PER_ROUND = 40;

export function createLibraryListJsxApp() {
    notifyManager.setScheduler((run) => run());
    const useCounts = create(() => ({
        counts: Array.from({ length: LIBRARY_LIST_ROWS }, (_, at) => at),
    }));
    const client = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity, retry: false } },
    });
    for (let at = 0; at < LIBRARY_LIST_ROWS; at++) client.setQueryData(['label', at], `item ${at}`);

    function Row({ at }) {
        const count = useCounts((state) => state.counts[at]);
        const { data } = useQuery({ queryKey: ['label', at], queryFn: () => `item ${at}` });
        return (
            <li className="row">
                <span>{data}</span>
                <b>{count}</b>
            </li>
        );
    }

    function List() {
        const rows = [];
        for (let at = 0; at < LIBRARY_LIST_ROWS; at++) rows.push(<Row key={at} at={at} />);
        return <ul className="rows">{rows}</ul>;
    }

    return {
        app: (
            <QueryClientProvider client={client}>
                <List />
            </QueryClientProvider>
        ),
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
