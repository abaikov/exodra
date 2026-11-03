import { withExoEffects } from '@exodra/core';
import type { TExoMachine } from '@exodra/core';
import type { TOIMDisposer } from '@oimdb/core';

type TWatch<TNode> = <TValue, TColumnName extends string = never>(
    select: (c: TNode) => {
        watch(
            body: (value: TValue) => void,
            columnNames?: readonly [TColumnName, ...TColumnName[]]
        ): TOIMDisposer;
    },
    apply: (c: TNode, value: TValue) => void,
    columnNames?: readonly [TColumnName, ...TColumnName[]]
) => void;

export function withExoOimWatches<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    declare: (watch: TWatch<TWiring & { state: TState }>) => void
): TMachine {
    return withExoEffects(machine, (effect) => {
        declare((select, apply, columnNames) => {
            effect((c) => select(c).watch((value) => apply(c, value), columnNames));
        });
    });
}
