import type { TExoMachine } from '../../machine/types/TExoMachine';
import type { TExoWiring } from './TExoWiring';
import type { TExoNode } from '../../schema/types/TExoNode';
import type { TExoChildrenPort } from '../../schema/ports/types/TExoChildrenPort';

// An `interface` because the component-taking calls name `this`, which a type alias answers TS2526
// to and then degrades to `any`, after which every parameter accepts everything with no diagnostic.
export interface TExoChildrenWiring<TEvent = unknown, TNode = unknown>
    extends TExoWiring<TEvent, TNode> {
    createExoNode<TParams>(machine: TExoMachine<this, unknown, TParams>): TExoNode;
    appendChild(port: TExoChildrenPort, node: TExoNode): TExoNode;
    insertChild(port: TExoChildrenPort, node: TExoNode, at: number): TExoNode;
    moveChild(node: TExoNode, at: number): void;
    moveChild(node: TExoNode, port: TExoChildrenPort, at?: number): void;
    removeChild(node: TExoNode): TExoNode;
    replaceChildren(port: TExoChildrenPort): void;
    childAt(port: TExoChildrenPort, at: number): TExoNode | undefined;
    childCount(port: TExoChildrenPort): number;
    one<TParams>(
        port: TExoChildrenPort,
        machine: TExoMachine<this, unknown, TParams>,
        params?: TParams
    ): void;
    list<TParams>(
        port: TExoChildrenPort,
        machine: TExoMachine<this, unknown, TParams>,
        params: readonly TParams[]
    ): void;
}
