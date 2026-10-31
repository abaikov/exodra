import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';
import type { TExoReactSlot } from '../types/TExoReactSlot';

export function readExoReactHook<TCell>(make: (slot: TExoReactSlot) => TCell): TCell {
    const slot = EXO_REACT_RENDER.slot;
    if (slot === null) {
        throw new Error(
            'A hook was called outside the body of a function component. Hooks keep their state ' +
                'on the component that is rendering, and nothing is rendering now.'
        );
    }
    const at = EXO_REACT_RENDER.hook++;
    const hooks = slot.hooks;
    if (at < hooks.length) return hooks[at] as TCell;
    const cell = make(slot);
    hooks.push(cell);
    return cell;
}
