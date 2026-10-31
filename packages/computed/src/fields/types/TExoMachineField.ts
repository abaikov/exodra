/**
 * `write` IS ERASED TO `unknown` so a list of fields of DIFFERENT value types is one type: a writer
 * taking `TValue` is contravariant and would break exactly the mixed `reads` list a derivation has.
 */
export interface TExoMachineField<TState, TValue> {
    readonly address: number;
    readonly bit: number;
    /** `-1` IS THE HAND-DECLARED FORM: no slot exists, so every reader must go through `read`. */
    readonly row: number;
    readonly read: (enode: TState) => TValue;
    readonly write: ((enode: TState, value: unknown) => void) | null;
}
