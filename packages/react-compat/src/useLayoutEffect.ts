import { EXO_REACT_RENDER } from './constants/EXO_REACT_RENDER';
import { queueExoReactEffect } from './render/queueExoReactEffect';

export function useLayoutEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
): void {
    queueExoReactEffect(EXO_REACT_RENDER.layoutEffects, effect, deps);
}
