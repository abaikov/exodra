import type { TExoSchema } from '@exodra/core';
import type { ExoEvent, ExoInputEvent } from '@exodra/jsx';
import { bindable } from '@exodra/reactivity';
import { createData, ROW_H, VIEWPORT_H, type Slot } from './virtual-data';
import { rowFor, onScreenReadout } from './virtual-row';

// Windowed (virtual) list over an oimdb ordered GLOBAL index. N rows in the data,
// only the visible slice mounted. The scroll VIEWPORT lives in a shared oimdb
// reactive object: scrolling writes ONE value; two decoupled UI parts subscribe —
// the list window and the "on screen" readout — with nothing prop-drilled. Costs:
//   • getSlots() is an O(1) cached reference (no copy)
//   • the filter recomputes ONCE per query change, never per scroll
//   • a scroll is O(1): compute [start,end) → write the viewport
//   • rendering a viewport change is O(window): slice + reconcile the ~visible rows
//   • per-row subscriptions live only while a row is mounted → O(window), not O(N)

// Instrumentation the smoke reads to PROVE scrolling is O(1)/O(window): `filter`
// must not run per scroll, only per query change.
export const virtualMetrics = { filterRuns: 0, windowRenders: 0 };

export default function virtualPage(): TExoSchema {
    virtualMetrics.filterRuns = 0;
    virtualMetrics.windowRenders = 0;
    const data = createData();
    const { ordered, viewport } = data;

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

    // A scroll is O(1): stimulate the window neuron with the new scroll position;
    // it derives the range and writes the shared viewport (drain → flush).
    let lastTop = 0;
    const publish = (scrollTop: number): void => {
        lastTop = scrollTop;
        data.scroll(scrollTop, filtered.length);
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
            if (!s) cache.set(slot.pk, (s = rowFor(data, slot, i, vp.total)));
            next.push(s);
        }
        for (const pk of cache.keys()) if (!live.has(pk)) cache.delete(pk);
        windowRows.setValue(next);
    };

    // Initial (synchronous — SSR-safe): seed the viewport + first window.
    publish(0);
    renderWindow();

    let raf = 0;
    let pendingTop = 0;
    const onScroll = (e: ExoEvent<HTMLElement>): void => {
        // Capture the LATEST position on every event; the frame publishes the most
        // recent scrollTop (trailing edge), never the stale leading-edge capture.
        pendingTop = e.currentTarget.scrollTop;
        if (raf) return;
        raf = 1;
        const run = (): void => { raf = 0; publish(pendingTop); };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
    };

    const onSearch = (e: ExoInputEvent): void => {
        query.setValue(e.currentTarget.value);
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
                // The page owns a page-scoped oimdb instance — tear it down on leave
                // so navigating away releases the 10k-row collection + index/object.
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
                    onExoMount: () => { stopList = viewport.subscribeOnKey('v', renderWindow); },
                    onExoUnmount: () => { stopList?.(); stopList = null; },
                }}
                handlers={{ onScroll }}
            >
                <div
                    static={{
                        class: 'vlist__spacer',
                        role: 'list',
                        'aria-label': 'Virtualized rows',
                    }}
                    bindable={{ style: spacerH, children: windowRows }}
                />
            </div>
        </div>
    );
}
