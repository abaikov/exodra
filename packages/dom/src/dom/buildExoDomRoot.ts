import type { TExoNode } from '@exodra/core';
import { armExoDomChild } from './armExoDomChild';
import { exoOnTeardown, exoTeardownScope } from './exoTeardownScope';
import type { TExoDomChild } from './types/TExoDomChild';
import type { TExoDomMark } from './types/TExoDomMark';
import type { TExoDomNodeApi } from './EXO_DOM_NODE_VOCABULARY';

export function buildExoDomRoot(
    node: TExoDomNodeApi & TExoNode<TExoDomMark>,
    params?: unknown
): TExoDomNodeApi & TExoNode<TExoDomMark> {
    const root = node as unknown as TExoDomChild;
    const ambient = exoTeardownScope(() => {
        armExoDomChild(root, params);
    });
    exoOnTeardown(root, ambient);
    return node;
}
