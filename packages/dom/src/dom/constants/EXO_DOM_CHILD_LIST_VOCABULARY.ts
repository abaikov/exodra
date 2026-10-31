import { assertExoArming, assertExoChildrenPort, exoVocabulary } from '@exodra/core';
import type { TExoChildrenPort } from '@exodra/core';
import { createExoChildList } from '../factories/createExoChildList';
import type { TExoDomNode, TExoDomPhaseSeams } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoChildList } from '../types/TExoChildList';

export const EXO_DOM_CHILD_LIST_VOCABULARY = /*#__PURE__*/ exoVocabulary({
    /** There is no hydrating form; the refusal is `openChildList`'s, which the hydrate pack replaces — ../../README.md § A commanded child list does not hydrate. `ownsParent` is handed in, never re-derived: ../../README.md § Clearing a child list that owns its element. */
    childList(this: TExoDomNode & TExoDomPhaseSeams, port: TExoChildrenPort): TExoChildList {
        // THE ONE RUNTIME KIND TEST ON THIS DOOR, because a cast is how an untyped caller arrives
        // and without it a child list opens on an attribute port's element and the page is wrong
        // with no error anywhere. Core's, so the server raises the SAME refusal from its own door.
        assertExoChildrenPort(port, 'childList', 'TExoDomNode');
        assertExoArming('childList');
        const index = port.index;
        const schema = this.schema;
        return createExoChildList(
            this.nodes[schema.elem[index]] as Element,
            this.openChildList(port),
            this.childListEndNode(port),
            schema.ownsElement[index] === 1
        );
    },
});
