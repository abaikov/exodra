/**
 * THE ROWS A RECONCILED CHILD LIST WAS SERVED, TAKEN EAGERLY. `openChildList` collects them,
 * `build` takes the next one per item the source names, and whatever is left when the wire ends is
 * surplus the server printed and the client's data does not want.
 *
 * COLLECTED AND NOT WALKED LAZILY, and the measurement that decided it: `ExoChildList.insert`
 * places an adopted row by `appendChild`, which MOVES it behind its own siblings, so a
 * `nextElementSibling` read after the first insert answers with a row already taken. Three served
 * rows came out as the whole list swept away.
 *
 * A MODULE CELL AND NOT A FIELD ON THE RECORD, because the record is the RENDER record too and a
 * field there is a field on every instance a page builds. Adoption is depth-first and synchronous,
 * so the cell is saved and restored around each instance's wiring — the same arrangement
 * `mountExoInstance` uses for `EXO_ARMED_INSTANCE`.
 */
export type TExoAdoptCursor = {
    readonly rows: readonly Element[];
    at: number;
};

export const EXO_ADOPT_CURSOR: { value: TExoAdoptCursor | null } = { value: null };

export function openExoAdoptCursor(rows: readonly Element[]): void {
    EXO_ADOPT_CURSOR.value = { rows, at: 0 };
}

/** The element to adopt into, or `null` when the data wants more rows than the server printed. */
export function takeExoAdoptedRow(): Element | null {
    const cursor = EXO_ADOPT_CURSOR.value;
    if (cursor === null) return null;
    const at = cursor.at;
    if (at >= cursor.rows.length) return null;
    cursor.at = at + 1;
    return cursor.rows[at];
}

export function dropExoAdoptSurplus(): void {
    const cursor = EXO_ADOPT_CURSOR.value;
    if (cursor === null) return;
    EXO_ADOPT_CURSOR.value = null;
    // NO SHAPE CHECK: the span was bounded by the child list's own end when it was collected, so
    // every element here is a row of this list and nothing of anybody else's can be in it.
    const rows = cursor.rows;
    for (let i = cursor.at; i < rows.length; i++) rows[i].remove();
}
