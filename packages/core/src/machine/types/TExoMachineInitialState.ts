/**
 * `index` is the position AT ARMING TIME only: a list moves rows, it does not re-arm them, so a
 * live position must be read from a source rather than captured here.
 *
 * WHAT IT RETURNS IS WHAT THE INSTANCE KEEPS. The value lands in `enode.state` and is read back
 * with `readState()`, which is why the transitions a wire hands out are closures over this one
 * instance: it is already in scope when they are made.
 */
export type TExoMachineInitialState<TWiring, TValue = unknown, TParams = unknown> = (
    enode: TWiring,
    index: number,
    params: TParams
) => TValue;
