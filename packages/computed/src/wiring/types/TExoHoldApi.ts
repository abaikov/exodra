import type { TExoCommitNode } from '../../computed/types/TExoCommitNode';
import type { TExoMachineDeclared } from '../../machine/types/TExoMachineDeclared';

/**
 * GENERIC IN THE RECEIVER, not polymorphic `this`, which resolves to the METHOD TABLE's type inside
 * a merged pack. A method and not a function, so a backend can wrap it.
 */
export interface TExoHoldApi {
    hold<TState extends TExoCommitNode, TResult>(
        this: TState,
        of: TExoMachineDeclared<TState>,
        body: (enode: TState) => TResult
    ): TResult;
}
