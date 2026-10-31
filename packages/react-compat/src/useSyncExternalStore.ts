import { readExoReactHook } from './render/readExoReactHook';
import { scheduleExoReactUpdate } from './render/scheduleExoReactUpdate';
import { useEffect } from './useEffect';
import type { TExoReactSlot } from './types/TExoReactSlot';

type TExoReactStoreCell<TSnapshot> = {
    readonly slot: TExoReactSlot;
    read: () => TSnapshot;
    shown: TSnapshot;
};

export function useSyncExternalStore<TSnapshot>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => TSnapshot
): TSnapshot {
    const value = getSnapshot();
    const cell = readExoReactHook(
        (slot): TExoReactStoreCell<TSnapshot> => ({ slot, read: getSnapshot, shown: value })
    );
    cell.read = getSnapshot;
    cell.shown = value;
    useEffect(() => {
        const check = (): void => {
            if (!Object.is(cell.read(), cell.shown)) scheduleExoReactUpdate(cell.slot);
        };
        const unsubscribe = subscribe(check);
        check();
        return unsubscribe;
    }, [subscribe]);
    return value;
}
