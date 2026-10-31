import { findExoRowDisagreement } from './findExoRowDisagreement';
import type { TExoMachine } from '@exodra/core';
import type { TExoDomApi } from '../dom/types/TExoDomApi';

// Only one direction needs repairing: markup with FEWER rows than the source has items is filled
// in by `attachExoList`'s opening diff, while a surplus stayed in the parent as inert bytes and,
// because the list inserts at the END of its parent, every row added later landed BEHIND it.
// The sweep stops at the child list's end the schema resolved (`adoptStopSlot`, taken from the END
// of the parent so rows cannot shift it). A row-SHAPE match is a resemblance and not a boundary —
// a static `<li>` after a list of `<li>`s matches exactly — so the shape check only decides where
// `stop` is `undefined`, which is a child list standing behind another child list.
// It returns where it stopped because the caller cannot recompute that after the removals.
// `findExoRowDisagreement` allocates an array per element, which is why it runs here — once per SURPLUS
// element, on a path that exists only because the page and the data already disagreed — and never
// on the adoption path itself.
export function dropUnadoptedExoRows(
    from: Element | null,
    // `null` means the end of the parent; `undefined` means hydration cannot know.
    stop: Node | null | undefined,
    machine: TExoMachine<never>,
    backend: TExoDomApi
): Element | null {
    let at = from;
    while (at !== null && at !== stop) {
        // Not a row of this schema: everything from here on is somebody else's.
        if (findExoRowDisagreement(machine, at, backend) !== null) return at;
        const next = at.nextElementSibling;
        at.remove();
        at = next;
    }
    return at;
}
