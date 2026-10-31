import type { TExoCommitNode } from '../../computed/types/TExoCommitNode';

export interface TExoMachineSettler<TState extends TExoCommitNode = TExoCommitNode> {
    instance: TState | null;
    settle: ((enode: TState) => void) | null;
}
