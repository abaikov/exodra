import type { TExoReactIdOwner } from '../types/TExoReactIdOwner';
import type { TExoReactSlot } from '../types/TExoReactSlot';

export const EXO_REACT_RENDER = {
    slot: null as TExoReactSlot | null,
    hook: 0,
    component: null as TExoReactSlot | null,
    insertionEffects: [] as (() => void)[],
    refs: [] as (() => void)[],
    layoutEffects: [] as (() => void)[],
    passiveEffects: [] as (() => void)[],
    dirty: [] as TExoReactSlot[],
    scheduled: false,
    idOwner: null as TExoReactIdOwner | null,
    passes: 0,
    transition: false,
    deferred: [] as { readonly slot: TExoReactSlot; readonly apply: (() => void) | null }[],
    deferredScheduled: false,
};
