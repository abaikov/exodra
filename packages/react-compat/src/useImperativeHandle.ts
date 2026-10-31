import { useLayoutEffect } from './useLayoutEffect';

export function useImperativeHandle<THandle>(
    ref: ((handle: THandle | null) => void) | { current: THandle | null } | null | undefined,
    create: () => THandle,
    deps?: readonly unknown[]
): void {
    useLayoutEffect(() => {
        if (ref === null || ref === undefined) return;
        if (typeof ref === 'function') {
            ref(create());
            return () => ref(null);
        }
        ref.current = create();
        return () => {
            ref.current = null;
        };
    }, deps);
}
