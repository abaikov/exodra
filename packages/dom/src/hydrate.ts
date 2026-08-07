import type { TExoSchema } from '@exodra/core';
import { ExoNodeDom } from './ExoNodeDom';
import { diagnoseBuildFailure } from './diagnoseBuildFailure';
import type { TExoDomMountResult } from './types/TExoDomMountResult';

export function hydrate(
    schema: TExoSchema,
    element: Element | Text
): TExoDomMountResult {
    let node: ExoNodeDom;
    try {
        node = ExoNodeDom.hydrate(
            schema as ConstructorParameters<typeof ExoNodeDom>[0],
            element
        );
    } catch (error) {
        // Same deal as mount(): the render path does no validation, so a failed
        // wiring gets one pass over the schema to name the actual mistake.
        throw (
            diagnoseBuildFailure(
                schema as Parameters<typeof diagnoseBuildFailure>[0],
                error
            ) ?? error
        );
    }

    node.commitMount();

    return {
        node,
        element,
        dispose() {
            node.dispose();
        },
    };
}
