import type { TExoNode } from '../schema/types/TExoNode';
import type { TExoDestroyableNode } from './types/TExoDestroyableNode';
import type { TExoMachineNode } from './types/TExoMachineNode';

export function destroyExoNode(node: TExoNode | TExoMachineNode): void {
    (node as unknown as TExoDestroyableNode).destroyExoSelf();
}
