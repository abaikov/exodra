import { composeExoMachine, createExoMachine, withExoEffects } from '@exodra/core';
import type { TExoChildrenPort, TExoCursorDeclaration } from '@exodra/core';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';
import type { TExoTestSource } from '@exodra/test-utils';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMachine } from '../types/TExoDomMachine';

export function createExoReconciledList<TItem>(
    schema: TExoCursorDeclaration<{ rows: TExoChildrenPort }>,
    src: Pick<TExoTestSource<readonly TItem[]>, 'getValue' | 'onChange'>,
    row: TExoDomMachine
): TExoDomMachine {
    const reconcileRows = createExoChildrenReconciler<TItem>(row);
    return composeExoMachine(createExoMachine<TExoDomNode>(schema), (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                reconcileRows(c as never, schema.ports.rows, src.getValue());
                return src.onChange(() =>
                    reconcileRows(c as never, schema.ports.rows, src.getValue())
                );
            });
        })
    );
}
