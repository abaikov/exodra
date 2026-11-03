import {
    composeExoMachine,
    createExoMachine,
    withExoEffects,
    withExoTransitions,
} from '@exodra/core';
import type { TExoChildrenPort, TExoCursorDeclaration } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoTestSource } from '@exodra/test-utils';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoChildList } from '../types/TExoChildList';
import type { TExoDomMachine } from '../types/TExoDomMachine';

export function createExoReconciledList<TItem>(
    schema: TExoCursorDeclaration<{ rows: TExoChildrenPort }>,
    src: Pick<TExoTestSource<readonly TItem[]>, 'getValue' | 'onChange'>,
    row: TExoDomMachine
): TExoDomMachine {
    const m = createExoMachine<TExoDomNode, unknown, { rows: TExoChildList; shown: TItem[] }>(
        schema,
        { createInitialState: (c) => ({ rows: c.childList(schema.ports.rows), shown: [] }) }
    );
    return composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const want = src.getValue();
                    c.state.shown = reconcileExoOrder(
                        c.state.rows,
                        c.state.shown,
                        want,
                        want,
                        (item) => c.build(row, item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return src.onChange(() => showRows(c));
                });
            });
        }
    );
}
