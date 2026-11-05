import type { TExoChildrenOwner } from './TExoChildrenOwner';

export type TExoChildrenReconciler<TItem> = <TPort, TMachine, TNode>(
    owner: TExoChildrenOwner<TMachine, TNode>,
    port: TPort,
    items: readonly TItem[]
) => void;
