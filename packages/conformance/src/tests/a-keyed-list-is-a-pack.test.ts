// @vitest-environment jsdom
import { composeExoPlugins, createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { EXO_KEYED_LIST_VOCABULARY } from '@exodra/list-reconcile';
import type { TExoKeyedList, TExoKeyedListApi } from '@exodra/list-reconcile';
import { source } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';

type TUser = { readonly id: number; readonly name: string };

type TListState = { readonly list: TExoKeyedList<TUser> };

describe('a keyed list is a pack', () => {
    it('runs from a machine: the list opened once, reconciled and refilled through transitions', () => {
        const ROW_SCHEMA = createExoSchema((b) => {
            let name!: TExoTextPort;
            b.el('li', null, (li) => {
                name = li.textPort();
            });
            return { name };
        });
        const mRow = createExoMachineBuilder<TExoDomNode>(ROW_SCHEMA);
        const setUser = mRow.transition((row: TExoDomNode, user: TUser) => {
            row.text(ROW_SCHEMA.ports.name, user.name);
        });
        const ROW = mRow.done();

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
        const mList = createExoMachineBuilder<TExoDomNode & TExoKeyedListApi, unknown, TListState>(
            LIST_SCHEMA
        );
        mList.createInitialState((c) => ({
            list: c.keyedList(
                LIST_SCHEMA.ports.rows,
                (user: TUser) => user.id,
                (user: TUser, i) => {
                    const row = c.build(ROW, i);
                    setUser(row, user);
                    return row;
                },
                setUser
            ),
        }));
        const showUsers = mList.transition((c) => c.state.list.reconcile(users.getValue()));
        mList.effect((c) => {
            showUsers(c);
            return users.onChange(() => showUsers(c));
        });
        const LIST = mList.done();

        const backend = composeExoPlugins(
            withExoChildList(withExoCompiler(new ExoDomBackend())),
            EXO_KEYED_LIST_VOCABULARY
        );
        const parent = document.createElement('div');
        backend.render(LIST, parent);
        const ada = parent.querySelector('li');

        users.setValue([
            { id: 2, name: 'bob' },
            { id: 1, name: 'ada lovelace' },
        ]);

        expect(parent.innerHTML).toBe('<ul><li>bob</li><li>ada lovelace</li></ul>');
        expect(parent.querySelectorAll('li')[1]).toBe(ada);
    });

    it('is absent from a backend that did not compose it', () => {
        expect('keyedList' in new ExoDomBackend()).toBe(false);
    });
});
