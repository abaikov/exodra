import { createExoDelegatedListener } from './factories/createExoDelegatedListener';
import type { TExoDelegatedRoot } from './types/TExoDelegatedRoot';
import type { TExoEventSlots } from './types/TExoEventSlots';

// Once per root, however many renders share it. Where the record lives, and why the slot is emptied
// by writing `undefined` rather than `delete`: ../../README.md § Installing a delegated root.
export function installExoDelegatedRoot(
    root: Element,
    rootKey: string,
    slots: readonly TExoEventSlots[]
): () => void {
    const carrier = root as unknown as Record<string, unknown>;
    const existing = carrier[rootKey] as TExoDelegatedRoot | undefined;
    if (existing !== undefined) {
        existing.liveRenders++;
        return makeRelease(existing, carrier, rootKey);
    }

    // Held so the teardown can remove exactly what was added — `removeEventListener` needs
    // the same function object, and these are per-root closures.
    const added: EventListener[] = [];
    for (let i = 0; i < slots.length; i++) {
        const listener = createExoDelegatedListener(root, slots[i]);
        root.addEventListener(slots[i].event, listener);
        added.push(listener);
    }

    const record: TExoDelegatedRoot = {
        liveRenders: 1,
        off: () => {
            for (let i = 0; i < added.length; i++) {
                root.removeEventListener(slots[i].event, added[i]);
            }
            carrier[rootKey] = undefined;
        },
    };
    carrier[rootKey] = record;
    return makeRelease(record, carrier, rootKey);
}

// IDEMPOTENT: a render's scope may be disposed twice, and a second decrement would take the counter
// negative and remove listeners another live render relies on.
// `carrier`/`rootKey` are captured only to check the record on the root is still THIS one — a root
// emptied and re-installed while a stale disposer was held would lose its new listeners.
function makeRelease(
    record: TExoDelegatedRoot,
    carrier: Record<string, unknown>,
    rootKey: string
): () => void {
    let released = false;
    return () => {
        if (released) return;
        released = true;
        record.liveRenders--;
        if (record.liveRenders > 0) return;
        if (carrier[rootKey] !== record) return;
        record.off();
    };
}
