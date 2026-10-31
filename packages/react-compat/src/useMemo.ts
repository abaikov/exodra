import { readExoReactHook } from './render/readExoReactHook';

type TExoReactMemoCell = { deps: readonly unknown[] | null; value: unknown };

export function useMemo<TValue>(make: () => TValue, deps: readonly unknown[] | undefined): TValue {
    const cell = readExoReactHook<TExoReactMemoCell>(() => ({ deps: null, value: undefined }));
    const previous = cell.deps;
    let same = previous !== null && deps !== undefined && previous.length === deps.length;
    if (same) {
        for (let i = 0; i < deps!.length; i++) {
            if (!Object.is((previous as readonly unknown[])[i], deps![i])) {
                same = false;
                break;
            }
        }
    }
    if (!same) {
        cell.value = make();
        cell.deps = deps ?? null;
    }
    return cell.value as TValue;
}
