import type { TExoSchema } from '@exodra/core';
import { ExoNodeDom } from './ExoNodeDom';
import type { TExoDomMountResult } from './types/TExoDomMountResult';

export function hydrate(
    schema: TExoSchema,
    element: Element | Text
): TExoDomMountResult {
    const node = ExoNodeDom.hydrate(
        schema as ConstructorParameters<typeof ExoNodeDom>[0],
        element
    );

    node.commitMount();

    return {
        node,
        element,
        dispose() {
            node.dispose();
        },
    };
}
