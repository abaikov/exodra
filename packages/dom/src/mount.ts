import type { TExoSchema } from '@exodra/core';
import { ExoNodeDom } from './ExoNodeDom';
import type { TExoDomMountResult } from './types/TExoDomMountResult';

export function mount(
    schema: TExoSchema,
    container: Element | DocumentFragment
): TExoDomMountResult {
    const node = new ExoNodeDom(
        schema as ConstructorParameters<typeof ExoNodeDom>[0]
    );

    const root = node.element;

    // Fragment root: `element` is a DocumentFragment whose children move into the
    // container on append. Track them so dispose() can remove them afterwards.
    if (root instanceof DocumentFragment) {
        const nodes = Array.from(root.childNodes);
        container.appendChild(root);
        node.commitMount();
        return {
            node,
            element: container as Element,
            dispose() {
                node.dispose();
                for (const child of nodes) (child as ChildNode).remove();
            },
        };
    }

    if (!root || root instanceof Comment) {
        throw new Error('ExoNodeDom did not create a root element');
    }

    container.appendChild(root);
    node.commitMount();

    return {
        node,
        element: root as Element | Text,
        // node.dispose() detaches the root element from the DOM itself.
        dispose() {
            node.dispose();
        },
    };
}
