/**
 * One transition's settle step, filled once the declaration returns: a transition is declared BEFORE the program it
 * settles exists, and this is the slot that lets the closure made then reach the settler made later.
 * `null` after that means the machine manages nothing that could need recomputing.
 */
export type TExoComputedSettleCell<TInstance> = {
    settle: ((enode: TInstance) => void) | null;
};
