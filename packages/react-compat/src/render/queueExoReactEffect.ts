import { readExoReactHook } from './readExoReactHook';
import type { TExoReactEffectCell } from '../types/TExoReactEffectCell';

function sameDeps(
    previous: readonly unknown[] | undefined | null,
    next: readonly unknown[] | undefined
): boolean {
    if (previous === null || previous === undefined || next === undefined) return false;
    if (previous.length !== next.length) return false;
    for (let i = 0; i < next.length; i++) if (!Object.is(previous[i], next[i])) return false;
    return true;
}

export function queueExoReactEffect(
    queue: (() => void)[],
    effect: () => void | (() => void),
    deps: readonly unknown[] | undefined
): void {
    const cell = readExoReactHook<TExoReactEffectCell>((slot) => ({
        effect: true,
        slot,
        deps: null,
        cleanup: null,
    }));
    if (sameDeps(cell.deps, deps)) return;
    cell.deps = deps;
    queue.push(() => {
        if (!cell.slot.alive) return;
        const cleanup = cell.cleanup;
        if (cleanup !== null) {
            cell.cleanup = null;
            cleanup();
        }
        const made = effect();
        cell.cleanup = typeof made === 'function' ? made : null;
    });
}
