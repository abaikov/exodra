import { disposeExoReactSlot } from './disposeExoReactSlot';
import { writeExoReactProps } from './writeExoReactProps';
import type { TExoReactHostState } from '../types/TExoReactHostState';

export function disposeExoReactHostState(state: TExoReactHostState): void {
    if (state.ref !== null) writeExoReactProps(state, state.props, null);
    const parts = state.parts;
    for (let p = 0; p < parts.length; p++) {
        if (parts[p].ref !== null) writeExoReactProps(parts[p], parts[p].props, null);
    }
    const regions = state.regions;
    for (let r = 0; r < regions.length; r++) {
        const slots = regions[r].slots;
        for (let i = 0; i < slots.length; i++) disposeExoReactSlot(slots[i]);
    }
}
