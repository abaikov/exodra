import { readExoReactHook } from './render/readExoReactHook';

export function useRef<TValue>(initial: TValue): { current: TValue } {
    return readExoReactHook(() => ({ current: initial }));
}
