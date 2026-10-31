export function unstable_batchedUpdates<TArgument, TResult>(
    run: (argument: TArgument) => TResult,
    argument?: TArgument
): TResult {
    return run(argument as TArgument);
}
