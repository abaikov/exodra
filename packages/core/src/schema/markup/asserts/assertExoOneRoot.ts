export function assertExoOneRoot(describedRoots: readonly string[]): void {
    if (describedRoots.length > 1) {
        const roots =
            describedRoots.slice(0, 6).join(', ') + (describedRoots.length > 6 ? ', …' : '');
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `createExoSchema: the cursor produced ${describedRoots.length} roots ` +
                  `(${roots}) and a schema is ONE element — every ` +
                  'one after the first would be dropped from the markup, and its ports would ' +
                  'keep the -1 they start life with, so a wire filling one reaches setters[-1]. ' +
                  'Siblings live INSIDE the root: give the root element a childrenPort() where ' +
                  'they stand, and let the wiring fill it with one() or list() — that port may ' +
                  'sit between static siblings, so a varying run of children needs no wrapper of ' +
                  'its own. A run that CHANGES over time is filled by the binding pack a backend ' +
                  'composes in. Siblings that are genuinely top ' +
                  'level are separate components, each rendered into the position it belongs in.'
                : `EXO0105 ${describedRoots.length}`
        );
    }
}
