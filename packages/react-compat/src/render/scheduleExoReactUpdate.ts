import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';
import { flushExoReactUpdates } from './flushExoReactUpdates';
import type { TExoReactSlot } from '../types/TExoReactSlot';

function flushDeferred(): void {
    flushExoReactUpdates(false, true);
}

export function scheduleExoReactUpdate(
    slot: TExoReactSlot,
    apply: (() => void) | null = null
): void {
    if (!slot.alive) return;
    const render = EXO_REACT_RENDER;
    if (render.transition) {
        render.deferred.push({ slot, apply });
        if (!render.deferredScheduled) {
            render.deferredScheduled = true;
            setTimeout(flushDeferred, 0);
        }
        return;
    }
    if (apply !== null) apply();
    if (slot.dirty) return;
    slot.dirty = true;
    render.dirty.push(slot);
    if (render.scheduled) return;
    render.scheduled = true;
    queueMicrotask(() => {
        if (render.scheduled) flushExoReactUpdates();
    });
}
