import {
    composeExoMachine,
    createExoMachine,
    withExoEffects,
    withExoTransitions,
} from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachineNode } from '@exodra/core';
import type { TExoTestSource } from './types/TExoTestSource';

export function createExoFollowingMachine<TPorts>(
    schema: TExoCursorDeclaration<TPorts>,
    src: Pick<TExoTestSource<unknown>, 'getValue' | 'onChange'>,
    show: (c: TExoMachineNode, value: unknown) => void
) {
    return composeExoMachine(
        createExoMachine<TExoMachineNode>(schema),
        (m) =>
            withExoTransitions(m, {
                show: (c) => {
                    show(c, src.getValue());
                },
            }),
        (m) => {
            const { show: follow } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    follow(c);
                    return src.onChange(() => follow(c));
                });
            });
        }
    );
}
