import {
    OIMEventQueue,
    OIMEventQueueSchedulerFactory,
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

// A page-scoped oimdb instance: the collection, an ordered keyless (global) array
// index (auto-sorted by rank; `getSlots()` is an O(1) cached reference), and a
// shared reactive `viewport` object read by multiple decoupled UI parts.
export function createData() {
    const queue = new OIMEventQueue({
        scheduler: OIMEventQueueSchedulerFactory.createMicrotask(),
    });
    const kit = createOIMCollectionKit<Row, string>(queue, { selectPk: r => r.id });
    kit.collection.upsertMany(makeRows());
    const ordered = kit.indexFactory.derivedArrayGlobalIndex({ orderBy: r => r.rank });
    const viewport = new OIMReactiveObject<'v', Viewport>(queue);
    return { queue, kit, ordered, viewport };
}

export type VirtualData = ReturnType<typeof createData>;
