/**
 * WHAT IT RETURNS IS WHAT THE INSTANCE KEEPS. The value lands in `enode.state` and is read back
 * with `readState()`, which is why the transitions a wire hands out are closures over this one
 * instance: it is already in scope when they are made.
 */
export type TExoMachineInitialState<TWiring, TValue = unknown, TParams = unknown> = (
    enode: TWiring,
    params: TParams
) => TValue;
