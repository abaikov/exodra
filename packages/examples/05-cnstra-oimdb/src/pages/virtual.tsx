import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import {
    OIMEventQueue,
    OIMEventQueueSchedulerFactory,
    OIMReactiveObject,
    createOIMCollectionKit,
} from '@oimdb/core';

// Windowed (virtual) list over an oimdb ordered GLOBAL index. N rows in the data,
// only the visible slice mounted. The scroll VIEWPORT lives in a shared oimdb
// reactive object (global state): scrolling writes ONE value; two decoupled parts
// of the UI subscribe to it — the list window and a separate "on screen" readout
// in the page bar. Nothing is prop-drilled between them; the global state fans out
// for free. Costs are honest:
//   • getSlots() is an O(1) cached reference (no copy)
//   • the filter recomputes ONCE per query change, never per scroll
//   • a scroll is O(1): compute [start,end) → write the viewport
//   • rendering a viewport change is O(window): slice + reconcile the ~visible rows
//   • per-row subscriptions live only while a row is mounted → O(window), not O(N)

const N = 10000;
const ROW_H = 36; // px, fixed row height
const VIEWPORT_H = 520; // px
const OVERSCAN = 6; // rows above/below the viewport

interface Row {
    id: string;
    rank: number;
    title: string;
    category: string;
    value: number;
    starred: boolean;
}

type Slot = { pk: string; item?: Row };
type Viewport = { start: number; end: number; total: number };

// Instrumentation the smoke reads to PROVE scrolling is O(1)/O(window): `filter`
// must not run per scroll, only per query change.
export const virtualMetrics = { filterRuns: 0, windowRenders: 0 };

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

function createData() {
    const queue = new OIMEventQueue({
        scheduler: OIMEventQueueSchedulerFactory.createMicrotask(),
    });
    const kit = createOIMCollectionKit<Row, string>(queue, { selectPk: r => r.id });
    kit.collection.upsertMany(makeRows());
    // Ordered, keyless (global) array index — auto-sorted by rank. getSlots() is a
    // stable O(1) reference to the ordered slots.
    const ordered = kit.indexFactory.derivedArrayGlobalIndex({ orderBy: r => r.rank });
    // The shared viewport — global reactive state read by multiple UI parts.
    const viewport = new OIMReactiveObject<'v', Viewport>(queue);
    return { queue, kit, ordered, viewport };
}

// --- a single virtualized row (built once per pk while inside the window) ------

function rowFor(
    kit: ReturnType<typeof createData>['kit'],
    slot: Slot,
    top: number
): TExoSchema {
    const pk = slot.pk;
    const starCls = bindable(
        kit.collection.getOneByPk(pk)?.starred ? 'vrow__star is-on' : 'vrow__star'
    );
    let stop: (() => void) | null = null;
    return (
        <div
            static={{
                class: 'vrow',
                'data-id': pk,
                style: `top:${top}px`,
                // Subscribe only while mounted → only the visible rows hold a
                // subscription. Dynamically-mounted rows (scrolled in) get this too.
                onExoMount: () => {
                    stop = kit.collection.subscribeOnKey(pk, () => {
                        const r = kit.collection.getOneByPk(pk);
                        starCls.setValue(r?.starred ? 'vrow__star is-on' : 'vrow__star');
                    });
                },
                onExoUnmount: () => {
                    stop?.();
                    stop = null;
                },
            }}
        >
            <span static={{ class: 'vrow__idx' }}>{`#${slot.item?.rank ?? ''}`}</span>
            <span static={{ class: 'vrow__title' }}>{slot.item?.title ?? ''}</span>
            <span static={{ class: `vrow__cat cat--${slot.item?.category}` }}>
                {slot.item?.category ?? ''}
            </span>
            <span static={{ class: 'vrow__val' }}>{String(slot.item?.value ?? '')}</span>
            <button
                bindable={{ class: starCls }}
                static={{ 'aria-label': 'Star' }}
                handlers={{
                    onClick: () => {
                        const r = kit.collection.getOneByPk(pk);
                        if (r) kit.collection.upsertOneByPk(pk, { starred: !r.starred });
                    },
                }}
            >
                ★
            </button>
        </div>
    );
}

// --- a decoupled readout: reads ONLY the shared viewport, no other coupling -----

function onScreenReadout(viewport: OIMReactiveObject<'v', Viewport>): TExoSchema {
    const text = bindable('');
    const render = () => {
        const vp = viewport.get('v');
        if (!vp) return;
        const last = Math.max(vp.start, vp.end - 1);
        text.setValue(`on screen #${vp.start}–#${last} · ${vp.total.toLocaleString()} total`);
    };
    render();
    let stop: (() => void) | null = null;
    return (
        <span
            static={{
                class: 'vp-readout',
                onExoMount: () => { stop = viewport.subscribeOnKey('v', render); },
                onExoUnmount: () => { stop?.(); stop = null; },
            }}
            bindable={{ textContent: text }}
        />
    );
}

export default function virtualPage(): TExoSchema {
    virtualMetrics.filterRuns = 0;
    virtualMetrics.windowRenders = 0;
    const { kit, ordered, viewport } = createData();

    const query = bindable('');

    // Cached ordered slice honouring the search filter. Recomputed ONLY when the
    // query or the underlying data changes — NEVER per scroll.
    let filtered: readonly Slot[] = ordered.getSlots() as Slot[];
    const refilter = (): void => {
        virtualMetrics.filterRuns += 1;
        const q = query.getValue().trim().toLowerCase();
        const all = ordered.getSlots() as Slot[];
        filtered = q
            ? all.filter(s => s.item != null && s.item.title.toLowerCase().includes(q))
            : all;
    };

    // A scroll is O(1): derive the range and write it to the shared viewport.
    let lastTop = 0;
    const publish = (scrollTop: number): void => {
        lastTop = scrollTop;
        const total = filtered.length;
        const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
        const end = Math.min(total, Math.ceil((scrollTop + VIEWPORT_H) / ROW_H) + OVERSCAN);
        viewport.setProperty('v', { start, end, total });
    };

    // The list window subscribes to the viewport. Rendering a change is O(window):
    // slice the cached list and reconcile ~visible rows (kept rows reused by
    // identity, entering built, leaving disposed).
    const cache = new Map<string, TExoSchema>();
    const windowRows = bindable<readonly TExoSchema[]>([]);
    const spacerH = bindable('0px');
    const renderWindow = (): void => {
        virtualMetrics.windowRenders += 1;
        const vp = viewport.get('v');
        if (!vp) return;
        spacerH.setValue(`${vp.total * ROW_H}px`);
        const live = new Set<string>();
        const next: TExoSchema[] = [];
        for (let i = vp.start; i < vp.end; i++) {
            const slot = filtered[i];
            if (!slot) continue;
            live.add(slot.pk);
            let s = cache.get(slot.pk);
            if (!s) cache.set(slot.pk, (s = rowFor(kit, slot, i * ROW_H)));
            next.push(s);
        }
        for (const pk of cache.keys()) if (!live.has(pk)) cache.delete(pk);
        windowRows.setValue(next);
    };

    // Initial (synchronous — SSR-safe): seed the viewport + first window.
    publish(0);
    renderWindow();

    let raf = 0;
    const onScroll = (e: Event): void => {
        const top = (e.target as HTMLElement).scrollTop;
        if (raf) return;
        raf = 1;
        const run = (): void => { raf = 0; publish(top); };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
    };

    const onSearch = (e: Event): void => {
        query.setValue((e.target as HTMLInputElement).value);
        cache.clear();
        refilter();
        publish(0); // reset to top under the new filter
    };

    let stopList: (() => void) | null = null;
    let stopData: (() => void) | null = null;
    return (
        <div
            static={{
                class: 'page page--virtual',
                // The page owns a page-scoped oimdb store — tear it down on leave so
                // navigating away releases the 10k-row collection + its index/object.
                onExoMount: () => {
                    stopData = ordered.subscribe(() => {
                        refilter();
                        publish(lastTop);
                    });
                },
                onExoUnmount: () => {
                    stopData?.();
                    stopData = null;
                    ordered.destroy();
                    viewport.destroy();
                },
            }}
        >
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Virtual</h1>
                {onScreenReadout(viewport)}
                <span static={{ class: 'page__spacer' }} />
                <input
                    static={{
                        class: 'add__input',
                        placeholder: 'Filter 10k rows…',
                        autocomplete: 'off',
                    }}
                    bindable={{ value: query }}
                    handlers={{ onInput: onSearch }}
                />
            </div>
            <div
                static={{
                    class: 'vlist',
                    style: `height:${VIEWPORT_H}px`,
                    // The list window is itself a viewport subscriber.
                    onExoMount: () => { stopList = viewport.subscribeOnKey('v', renderWindow); },
                    onExoUnmount: () => { stopList?.(); stopList = null; },
                }}
                handlers={{ onScroll }}
            >
                <div
                    static={{ class: 'vlist__spacer' }}
                    bindable={{ style: spacerH, children: windowRows }}
                />
            </div>
        </div>
    );
}
