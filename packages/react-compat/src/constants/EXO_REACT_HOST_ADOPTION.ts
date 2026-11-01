import type { TExoReactHostShape } from '../types/TExoReactHostShape';
import type { TExoReactSlot } from '../types/TExoReactSlot';

export const EXO_REACT_HOST_ADOPTION = {
    adopt: null as ((slot: TExoReactSlot, shape: TExoReactHostShape) => void) | null,
};
