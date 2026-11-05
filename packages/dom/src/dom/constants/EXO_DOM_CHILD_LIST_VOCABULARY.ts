import { assertExoChildrenPort, exoVocabulary } from '@exodra/core';
import type { TExoChildrenPort, TExoNode } from '@exodra/core';
import { createExoChildList } from '../factories/createExoChildList';
import type { TExoDomNode, TExoDomPhaseSeams } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoChildList } from '../types/TExoChildList';
import type { TExoDomPortChildList } from '../types/TExoDomPortChildList';
import type { TExoDomChild } from '../types/TExoDomChild';
import type { TExoDomMark } from '../types/TExoDomMark';

type TExoDomPortOwner = TExoDomNode & TExoDomPhaseSeams & TExoDomPortChildList;

function portChildListOf(owner: TExoDomPortOwner, port: TExoChildrenPort): TExoChildList {
    const index = port.index;
    const lists = (owner.portChildren ??= []);
    let list = lists[index];
    if (list === undefined) {
        assertExoChildrenPort(port, 'the children port methods', 'TExoDomNode');
        const schema = owner.schema;
        const served: Element[] = [];
        const order = owner.openChildList(port, served);
        list = createExoChildList(
            owner.nodes[schema.elem[index]] as Element,
            order,
            owner.childListEndNode(port),
            schema.ownsElement[index] === 1,
            served.length === 0 ? null : served,
            owner
        );
        lists[index] = list;
    }
    return list;
}

function placeExoChild(list: TExoChildList, node: TExoNode<TExoDomMark>, at?: number): void {
    const from = (node as unknown as TExoDomChild).placedIn;
    if (from === null) {
        list.insert(node, at);
        return;
    }
    from.detach(from.indexOf(node));
    list.attach(node, at);
}

export const EXO_DOM_CHILD_LIST_VOCABULARY = /*#__PURE__*/ exoVocabulary({
    portChildList(this: TExoDomPortOwner, port: TExoChildrenPort): TExoChildList {
        // THE ONE RUNTIME KIND TEST ON THIS DOOR, because a cast is how an untyped caller arrives
        // and without it a child list opens on an attribute port's element and the page is wrong
        // with no error anywhere. Core's, so the server raises the SAME refusal from its own door.
        assertExoChildrenPort(port, 'portChildList', 'TExoDomNode');
        return portChildListOf(this, port);
    },

    appendChild<TNode extends TExoNode<TExoDomMark>>(
        this: TExoDomPortOwner,
        port: TExoChildrenPort,
        node: TNode
    ): TNode {
        placeExoChild(portChildListOf(this, port), node);
        return node;
    },

    insertChild<TNode extends TExoNode<TExoDomMark>>(
        this: TExoDomPortOwner,
        port: TExoChildrenPort,
        node: TNode,
        at: number
    ): TNode {
        placeExoChild(portChildListOf(this, port), node, at);
        return node;
    },

    moveChild(
        this: TExoDomPortOwner,
        node: TExoNode<TExoDomMark>,
        portOrAt: TExoChildrenPort | number,
        at?: number
    ): void {
        const from = (node as unknown as TExoDomChild).placedIn;
        if (typeof portOrAt === 'number') {
            if (from !== null) from.move(from.indexOf(node), portOrAt);
            return;
        }
        const to = portChildListOf(this, portOrAt);
        if (from === to) {
            to.move(to.indexOf(node), at === undefined ? to.size - 1 : at);
            return;
        }
        placeExoChild(to, node, at);
    },

    removeChild<TNode extends TExoNode<TExoDomMark>>(this: TExoDomPortOwner, node: TNode): TNode {
        const dom = node as unknown as TExoDomChild;
        const from = dom.placedIn;
        if (from === null) return node;
        from.detach(from.indexOf(node));
        const live = dom.live;
        if (live !== null) live.setMounted?.(live, false);
        return node;
    },

    replaceChildren(this: TExoDomPortOwner, port: TExoChildrenPort): void {
        portChildListOf(this, port).removeAll();
    },

    childAt(
        this: TExoDomPortOwner,
        port: TExoChildrenPort,
        at: number
    ): TExoNode<TExoDomMark> | undefined {
        return portChildListOf(this, port).at(at);
    },

    childCount(this: TExoDomPortOwner, port: TExoChildrenPort): number {
        return portChildListOf(this, port).size;
    },
});
