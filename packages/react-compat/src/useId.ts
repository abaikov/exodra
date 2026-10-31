import { nextExoId } from '@exodra/context';
import { EXO_REACT_RENDER } from './constants/EXO_REACT_RENDER';
import { readExoReactHook } from './render/readExoReactHook';
import type { TExoReactIdOwner } from './types/TExoReactIdOwner';

export function useId(): string {
    return readExoReactHook((slot) =>
        nextExoId(
            (slot.parentRange === null
                ? EXO_REACT_RENDER.idOwner
                : slot.parentRange.owner) as TExoReactIdOwner
        )
    );
}
