import { useMemo } from './useMemo';

export function useCallback<TCallback>(callback: TCallback, deps: readonly unknown[]): TCallback {
    return useMemo(() => callback, deps);
}
