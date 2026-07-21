import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import type { OIMReactiveObject } from '@oimdb/core';
import { ROW_H, type Slot, type Viewport, type VirtualData } from './virtual-data';

// A single virtualized row — built once per pk while it is inside the window.
// It subscribes to its own entity ONLY while mounted (onExoMount/onExoUnmount),
// so at any moment only the ~visible rows hold a subscription — O(window), not
// O(N). Dynamically scrolled-in rows get their onExoMount fired too.
//
// Accessibility: a windowed list only mounts ~25 nodes, so screen readers would
// otherwise think the list has ~25 rows. `role="listitem"` + `aria-setsize`
// (the true total) + `aria-posinset` (this row's absolute position) tell assistive
// tech the real shape. They are re-baked when the filter changes the total (the
// window cache is cleared), so they stay accurate.
export function rowFor(
    kit: VirtualData['kit'],
    slot: Slot,
    index: number,
    total: number
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
                role: 'listitem',
                'aria-setsize': total,
                'aria-posinset': index + 1,
                style: `top:${index * ROW_H}px`,
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

// A decoupled readout: it reads ONLY the shared viewport object — no props, no
// reference to the list. Global reactive state fans out to it for free.
export function onScreenReadout(
    viewport: OIMReactiveObject<'v', Viewport>
): TExoSchema {
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
