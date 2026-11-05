export type TExoChildrenOwner<TMachine, TNode> = {
    createExoNode(machine: TMachine): TNode;
};
