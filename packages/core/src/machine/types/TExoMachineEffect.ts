/**
 * `start` IS A METHOD AND NOT A FUNCTION-TYPED PROPERTY: a property is contravariant under
 * `strictFunctionTypes` and would refuse in both directions; a method is bivariant and does not.
 */
export interface TExoMachineEffect<TState> {
    readonly at: number;
    start(enode: TState): (() => void) | null;
}
