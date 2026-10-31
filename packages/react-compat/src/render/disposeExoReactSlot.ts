import type { TExoReactEffectCell } from '../types/TExoReactEffectCell';
import type { TExoReactSlot } from '../types/TExoReactSlot';

export function disposeExoReactSlot(slot: TExoReactSlot): void {
    if (!slot.alive) return;
    slot.alive = false;
    if (slot.kind === 'text' || slot.kind === 'host') return;
    const hooks = slot.hooks;
    const instance = hooks[0] as
        | { componentWillUnmount?: () => void; exoReact?: object }
        | undefined;
    if (
        instance !== undefined &&
        instance !== null &&
        typeof instance === 'object' &&
        'exoReact' in instance
    ) {
        instance.componentWillUnmount?.();
    }
    for (let i = 0; i < hooks.length; i++) {
        const cell = hooks[i] as Partial<TExoReactEffectCell> | null;
        if (cell === null || typeof cell !== 'object' || cell.effect !== true) continue;
        const cleanup = cell.cleanup;
        if (cleanup !== null && cleanup !== undefined) {
            cell.cleanup = null;
            cleanup();
        }
    }
    const range = slot.range;
    if (range === null) return;
    const slots = range.slots;
    for (let i = 0; i < slots.length; i++) disposeExoReactSlot(slots[i]);
    if (slot.kind === 'portal') {
        range.slots = [];
        range.leafCount = 0;
        range.list.removeAll();
    }
}
