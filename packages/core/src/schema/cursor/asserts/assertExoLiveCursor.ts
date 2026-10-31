import type { TExoSchemaDraft } from '../types/TExoSchemaDraft';

export function assertExoLiveCursor(draft: TExoSchemaDraft, declaredBy: string): void {
    if (draft.open) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: the schema this cursor was building is FINISHED` +
              ' — a cursor MOVES, so one kept past the build stands wherever the build left ' +
              'it rather than where it was captured, and the declaration it would write into has ' +
              'already numbered its ports: the element would reach no schema and the port would ' +
              'be filled by nobody, with no error anywhere. Declare everything inside the ' +
              'build callback, and call fork() where two positions are needed at once.'
            : 'EXO0087'
    );
}
