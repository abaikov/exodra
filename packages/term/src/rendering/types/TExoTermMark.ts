// THE HAZARD IT CLOSES: `bindChildren` casts its array straight to `readonly TExoTermChild[]` and
// reads `.node` off every entry, so a value from another backend reads `undefined` and nothing here
// notices before the screen does. A `unique symbol` in its own package is a marker none can spell.
declare const EXO_TERM_MARK: unique symbol;

export type TExoTermMark = {
    readonly [EXO_TERM_MARK]: true;
};
