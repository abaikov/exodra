import { armExoNode } from '@exodra/core';
import type { TExoMachine, TExoMachineNode } from '@exodra/core';
import { holdExoInstance } from './holdExoInstance';
import { EXO_ARMED_INSTANCE } from './constants/EXO_ARMED_INSTANCE';
import { EXO_NO_MOUNT } from './factories/createExoDomChildFactory';
import type { TExoDomChild } from './types/TExoDomChild';

export function armExoDomChild(child: TExoDomChild, params: unknown): void {
    armExoNode(
        child as unknown as TExoMachineNode,
        child.machine as TExoMachine<TExoMachineNode>,
        params
    );
    EXO_ARMED_INSTANCE.value = child;
    holdExoInstance(child);
    if (child.node.parentNode !== null && child.mount !== EXO_NO_MOUNT) child.mount();
}
