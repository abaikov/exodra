import { CNS, collateral, neuron } from '@cnstra/core';
import {
    OIMEventQueue,
    OIMReactiveObject,
    createOIMCollectionKit,
} from '@oimdb/core';

// The synthetic 10k-row dataset + its oimdb setup, kept apart from the
// windowing technique (in `virtual.tsx`) so a reader can focus on how the
// virtual list works, not on how the fake data is generated.

export const N = 10000;
export const ROW_H = 36; // px — must match `.vrow` height in the CSS
export const VIEWPORT_H = 520; // px
export const OVERSCAN = 6; // rows rendered above/below the viewport

export interface Row {
    id: string;
    rank: number;
    title: string;
    category: string;
    value: number;
    starred: boolean;
}

export type Slot = { pk: string; item?: Row };
export type Viewport = { start: number; end: number; total: number };

const CATEGORIES = ['bug', 'feature', 'chore', 'docs', 'test'] as const;
const WORDS = [
    'refactor', 'pipeline', 'cache', 'render', 'index', 'stream', 'schema',
    'reactive', 'commit', 'hydrate', 'signal', 'buffer', 'query', 'diff',
];

function makeRows(): Row[] {
    const rows: Row[] = new Array(N);
    for (let i = 0; i < N; i++) {
        rows[i] = {
            id: `r${i}`,
            rank: i,
            title: `#${i} — ${WORDS[(i * 7) % WORDS.length]} ${WORDS[(i * 3) % WORDS.length]}`,
            category: CATEGORIES[i % CATEGORIES.length],
            value: (i * 37) % 1000,
            starred: false,
        };
    }
    return rows;
}

// The two mutations this page makes — moving the scroll window and starring a row
// — are cnstra commands, so (exactly like the workspace) nothing writes to the
// store directly and the CNS drain is the single commit point.
export const scrolled = collateral<{ scrollTop: number; total: number }>();
export const starToggled = collateral<{ id: string }>();

// A page-scoped oimdb instance + its own mini-CNS: the collection, an ordered
// keyless (global) array index (auto-sorted by rank; `getSlots()` is an O(1)
// cached reference), and a shared reactive `viewport` object read by multiple
// decoupled UI parts. The queue has NO scheduler — it flushes only when the CNS
// drains, so scroll/star land on a single synchronous tick (snappier, no
// microtask hop).
export function createData() {
    const queue = new OIMEventQueue();
    const kit = createOIMCollectionKit<Row, string>(queue, { selectPk: r => r.id });
    kit.collection.upsertMany(makeRows());
    const ordered = kit.indexFactory.derivedArrayGlobalIndex({ orderBy: r => r.rank });
    const viewport = new OIMReactiveObject<'v', Viewport>(queue);

    // Window neuron: a scroll computes the visible [start,end) and writes the
    // viewport; a star toggle flips the row. Emits nothing (empty axon).
    const windowNeuron = neuron({})
        .dendrite({
            collateral: scrolled,
            response: ({ scrollTop, total }) => {
                const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
                const end = Math.min(
                    total,
                    Math.ceil((scrollTop + VIEWPORT_H) / ROW_H) + OVERSCAN
                );
                viewport.setProperty('v', { start, end, total });
            },
        })
        .dendrite({
            collateral: starToggled,
            response: ({ id }) => {
                const r = kit.collection.getOneByPk(id);
                if (r) kit.collection.upsertOneByPk(id, { starred: !r.starred });
            },
        });

    const cns = new CNS([windowNeuron]);
    cns.addDrainListener(() => queue.flush());

    return {
        queue,
        kit,
        ordered,
        viewport,
        cns,
        // Command dispatchers — the page's only way to mutate the store.
        scroll: (scrollTop: number, total: number) =>
            cns.stimulate(scrolled.createSignal({ scrollTop, total })),
        toggleStar: (id: string) =>
            cns.stimulate(starToggled.createSignal({ id })),
    };
}

export type VirtualData = ReturnType<typeof createData>;
