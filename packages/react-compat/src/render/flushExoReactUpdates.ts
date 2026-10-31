import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';
import { placeExoReactRange } from './placeExoReactRange';
import { schedulePassiveExoReactEffects } from './schedulePassiveExoReactEffects';
import { EXO_REACT_RECONCILER } from './EXO_REACT_RECONCILER';
import type { TExoReactRange } from '../types/TExoReactRange';
import type { TExoReactSlot } from '../types/TExoReactSlot';

const RENDER_PASSES_LIMIT = 50;

function commitEffects(): void {
    const render = EXO_REACT_RENDER;
    const insertion = render.insertionEffects;
    render.insertionEffects = [];
    for (let i = 0; i < insertion.length; i++) insertion[i]();
    const refs = render.refs;
    render.refs = [];
    for (let i = 0; i < refs.length; i++) refs[i]();
    const layout = render.layoutEffects;
    render.layoutEffects = [];
    for (let i = 0; i < layout.length; i++) layout[i]();
}

function renderDirty(): void {
    const render = EXO_REACT_RENDER;
    let passes = 0;
    while (render.dirty.length > 0) {
        if (++passes > RENDER_PASSES_LIMIT) {
            for (const slot of render.dirty) slot.dirty = false;
            render.dirty = [];
            throw new Error(
                'Too many re-renders: state set during render kept scheduling the same ' +
                    'components again.'
            );
        }
        const batch: TExoReactSlot[] = render.dirty;
        render.dirty = [];
        batch.sort((a, b) => a.depth - b.depth);
        let at = 0;
        try {
            for (; at < batch.length; at++) {
                const slot = batch[at];
                if (!slot.alive || !slot.dirty) continue;
                EXO_REACT_RECONCILER.renderSlot(slot);
                placeExoReactRange(slot.range as TExoReactRange);
            }
        } catch (error) {
            for (let i = at; i < batch.length; i++) batch[i].dirty = false;
            for (const slot of render.dirty) slot.dirty = false;
            render.dirty = [];
            throw error;
        }
    }
}

function takeDeferred(): void {
    const render = EXO_REACT_RENDER;
    render.deferredScheduled = false;
    const deferred = render.deferred;
    render.deferred = [];
    for (let i = 0; i < deferred.length; i++) {
        const { slot, apply } = deferred[i];
        if (apply !== null) apply();
        if (!slot.alive || slot.dirty) continue;
        slot.dirty = true;
        render.dirty.push(slot);
    }
}

export function flushExoReactUpdates(passiveNow = false, withDeferred = passiveNow): void {
    const render = EXO_REACT_RENDER;
    render.scheduled = false;
    if (withDeferred) takeDeferred();
    let commits = 0;
    do {
        if (render.dirty.length > 0) schedulePassiveExoReactEffects(true);
        renderDirty();
        commitEffects();
        if (passiveNow) schedulePassiveExoReactEffects(true);
        if (withDeferred && render.deferred.length > 0) takeDeferred();
        if (++commits > RENDER_PASSES_LIMIT) {
            throw new Error('Too many re-renders: effects kept setting state that re-ran them.');
        }
    } while (
        render.dirty.length > 0 ||
        render.refs.length > 0 ||
        render.insertionEffects.length > 0 ||
        render.layoutEffects.length > 0 ||
        (passiveNow && render.passiveEffects.length > 0)
    );
    schedulePassiveExoReactEffects(false);
}
