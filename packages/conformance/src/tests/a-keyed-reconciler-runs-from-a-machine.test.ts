// @vitest-environment jsdom
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    withExoWire,
    createExoSchema,
} from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';
import { source } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';

type TUser = { readonly id: number; readonly name: string };

describe('a keyed reconciler', () => {
    it('runs from a machine: reconciled and refilled through transitions', () => {
        const ROW_SCHEMA = createExoSchema((b) => {
            let name!: TExoTextPort;
            b.el('li', null, (li) => {
                name = li.textPort();
            });
            return { name };
        });
        const ROW = composeExoMachine(createExoMachine<TExoDomNode>(ROW_SCHEMA), (m) =>
            withExoWire(m, (row: TExoDomNode, user: TUser) => {
                row.text(ROW_SCHEMA.ports.name, user.name);
            })
        );
        const reconcileUsers = createExoChildrenReconciler<TUser>(ROW, { key: (user) => user.id });

        const users = source<readonly TUser[]>([
            { id: 1, name: 'ada' },
            { id: 2, name: 'bob' },
        ]);
        const LIST_SCHEMA = createExoSchema((b) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows };
        });
        const LIST = composeExoMachine(
            createExoMachine<TExoDomNode>(LIST_SCHEMA),
            (m) =>
                withExoTransitions(m, {
                    showUsers: (c) => reconcileUsers(c, LIST_SCHEMA.ports.rows, users.getValue()),
                }),
            (m) => {
                const { showUsers } = m.transitions;
                return withExoEffects(m, (effect) => {
                    effect((c) => {
                        showUsers(c);
                        return users.onChange(() => showUsers(c));
                    });
                });
            }
        );

        const parent = document.createElement('div');
        withExoCompiler(new ExoDomBackend()).render(LIST, parent);
        const ada = parent.querySelector('li');

        users.setValue([
            { id: 2, name: 'bob' },
            { id: 1, name: 'ada lovelace' },
        ]);

        expect(parent.innerHTML).toBe('<ul><li>bob</li><li>ada lovelace</li></ul>');
        expect(parent.querySelectorAll('li')[1]).toBe(ada);
    });
});
