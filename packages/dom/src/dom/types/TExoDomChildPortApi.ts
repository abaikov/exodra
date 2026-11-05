import type { TExoChildrenPort, TExoNode } from '@exodra/core';
import type { TExoDomMark } from './TExoDomMark';

export interface TExoDomChildPortApi {
    appendChild<TNode extends TExoNode<TExoDomMark>>(port: TExoChildrenPort, node: TNode): TNode;
    insertChild<TNode extends TExoNode<TExoDomMark>>(
        port: TExoChildrenPort,
        node: TNode,
        at: number
    ): TNode;
    moveChild(node: TExoNode<TExoDomMark>, at: number): void;
    moveChild(node: TExoNode<TExoDomMark>, port: TExoChildrenPort, at?: number): void;
    removeChild<TNode extends TExoNode<TExoDomMark>>(node: TNode): TNode;
    replaceChildren(port: TExoChildrenPort): void;
    childAt(port: TExoChildrenPort, at: number): TExoNode<TExoDomMark> | undefined;
    childCount(port: TExoChildrenPort): number;
}
