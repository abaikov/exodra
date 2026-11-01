import type { TExoMachineNode } from '@exodra/core';
import { TodoCnsContext } from './TodoCnsContext';
import type { TTodoCns } from './types/TTodoCns';

export function injectTodoCns(c: TExoMachineNode): TTodoCns {
    const cns = c.inject(TodoCnsContext);
    if (cns === undefined)
        throw new Error('No TTodoCns above this node: render TodoApp with { cns }.');
    return cns;
}
