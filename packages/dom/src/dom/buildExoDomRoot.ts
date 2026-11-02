import type { TExoNode } from '@exodra/core';
import { buildLiveExoChild } from './buildLiveExoChild';
import { exoOnTeardown, exoTeardownScope } from './exoTeardownScope';
import type { TExoDomMachine } from './types/TExoDomMachine';
import type { TExoDomChild } from './types/TExoDomChild';
import type { TExoDomMark } from './types/TExoDomMark';
import type { TExoDomNodeApi } from './EXO_DOM_NODE_VOCABULARY';
import type { TExoDomSchema } from './types/TExoDomSchema';

export function buildExoDomRoot(
    schema: TExoDomSchema,
    machine: TExoDomMachine,
    params?: unknown
): TExoDomNodeApi & TExoNode<TExoDomMark> {
    let child: TExoDomChild | null = null;
    const ambient = exoTeardownScope(() => {
        child = buildLiveExoChild(schema, machine, null, params);
    });
    const root = child as unknown as TExoDomChild;
    exoOnTeardown(root, ambient);
    return root as unknown as TExoDomNodeApi & TExoNode<TExoDomMark>;
}
