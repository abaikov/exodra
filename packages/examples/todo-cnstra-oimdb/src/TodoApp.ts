import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoEventPortKind,
    exoPorts,
    withExoEffects,
    withExoHandlers,
} from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoMachineNodeOf } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TOIMColumnGroup } from '@oimdb/core';
import * as oimdb from '@oimdb/core/oimdb';
import { TodoRow } from './TodoRow';
import { TodoCnsContext } from './TodoCnsContext';
import { injectTodoCns } from './injectTodoCns';
import { TodoUiAxon } from './TodoUiAxon';
import { TodoDb } from './TodoDb';
import type { TTodoAppParams } from './types/TTodoAppParams';
import type { TTodoAppState } from './types/TTodoAppState';
import type { TTodoFilter } from './types/TTodoFilter';
import type { TTodoSlot } from './types/TTodoSlot';

const ports = exoPorts({
    draft: EXO_PORT_ATTR,
    draftKeydown: exoEventPortKind<KeyboardEvent>(),
    mainHidden: EXO_PORT_ATTR,
    rows: EXO_PORT_CHILDREN,
    footerHidden: EXO_PORT_ATTR,
    left: EXO_PORT_TEXT,
    leftLabel: EXO_PORT_TEXT,
    allFilterClass: EXO_PORT_ATTR,
    activeFilterClass: EXO_PORT_ATTR,
    completedFilterClass: EXO_PORT_ATTR,
    allFilterClick: EXO_PORT_EVENT,
    activeFilterClick: EXO_PORT_EVENT,
    completedFilterClick: EXO_PORT_EVENT,
    clearHidden: EXO_PORT_ATTR,
    clearCompleted: EXO_PORT_EVENT,
});

const doneColumn: TOIMColumnGroup = { key: 'done', columnNames: ['done'] };

const filterLinks: readonly {
    filter: TTodoFilter;
    label: string;
    classPort: TExoAttrPort;
    clickPort: TExoEventPort;
}[] = [
    {
        filter: 'all',
        label: 'All',
        classPort: ports.allFilterClass,
        clickPort: ports.allFilterClick,
    },
    {
        filter: 'active',
        label: 'Active',
        classPort: ports.activeFilterClass,
        clickPort: ports.activeFilterClick,
    },
    {
        filter: 'completed',
        label: 'Completed',
        classPort: ports.completedFilterClass,
        clickPort: ports.completedFilterClick,
    },
];

const todoAppSchema = createExoSchema(ports, (b) => {
    b.el('section', { class: 'todoapp' }, (app) => {
        app.el('header', { class: 'header' }, (header) => {
            header.el('h1', null, (h1) => {
                h1.text('todos');
            });
            header.el(
                'input',
                { class: 'new-todo', placeholder: 'What needs to be done?', autofocus: '' },
                (input) => {
                    input.attrPort(ports.draft, 'value');
                    input.eventPort(ports.draftKeydown, 'keydown');
                }
            );
        });
        app.el('section', { class: 'main' }, (main) => {
            main.attrPort(ports.mainHidden, 'hidden');
            main.el('ul', { class: 'todo-list' }, (ul) => {
                ul.childrenPort(ports.rows);
            });
        });
        app.el('footer', { class: 'footer' }, (footer) => {
            footer.attrPort(ports.footerHidden, 'hidden');
            footer.el('span', { class: 'todo-count' }, (count) => {
                count.el('strong', null, (strong) => {
                    strong.textPort(ports.left);
                });
                count.el('span', null, (label) => {
                    label.textPort(ports.leftLabel);
                });
            });
            footer.el('ul', { class: 'filters' }, (ul) => {
                for (const { filter, label, classPort, clickPort } of filterLinks) {
                    ul.el('li', null, (li) => {
                        li.el('a', { href: `#/${filter}` }, (a) => {
                            a.attrPort(classPort, 'class');
                            a.eventPort(clickPort, 'click');
                            a.text(label);
                        });
                    });
                }
            });
            footer.el('button', { class: 'clear-completed', type: 'button' }, (button) => {
                button.attrPort(ports.clearHidden, 'hidden');
                button.eventPort(ports.clearCompleted, 'click');
                button.text('Clear completed');
            });
        });
    });
});

const todoAppBase = createExoMachine<TExoDomNode, TTodoAppParams, TTodoAppState>(todoAppSchema, {
    createInitialState: (c, params): TTodoAppState => {
        c.provide(TodoCnsContext, params.cns);
        return { rows: c.childList(ports.rows), shownSlots: [] };
    },
});

function shownFilter(): TTodoFilter {
    return TodoDb.filter.getEntity()?.filter ?? 'all';
}

function showCounts(c: TExoDomNode): void {
    const active = TodoDb.todosByDone.getEntityCountByKey('active');
    const done = TodoDb.todosByDone.getEntityCountByKey('done');
    const empty = active + done === 0;
    c.text(ports.left, active);
    c.text(ports.leftLabel, active === 1 ? ' item left' : ' items left');
    c.attr(ports.mainHidden, empty);
    c.attr(ports.footerHidden, empty);
    c.attr(ports.clearHidden, done === 0);
}

function showFilter(c: TExoDomNode): void {
    const current = shownFilter();
    for (const { filter, classPort } of filterLinks) {
        c.attr(classPort, filter === current ? 'selected' : undefined);
    }
}

function showRows(c: TExoMachineNodeOf<typeof todoAppBase>): void {
    const state = c.state;
    const shown = shownFilter();
    const visibleSlots: TTodoSlot[] = [];
    for (const slot of TodoDb.todosInOrder.getSlotByKey('all').getBucketMemberSlots()) {
        const todo = slot.readEntity(doneColumn);
        if (todo === undefined) continue;
        if (shown === 'all' || todo.done === (shown === 'completed')) visibleSlots.push(slot);
    }
    state.shownSlots = reconcileExoOrder(
        state.rows,
        state.shownSlots,
        visibleSlots,
        visibleSlots,
        (slot) => c.build(TodoRow, slot)
    );
}

export const TodoApp = composeExoMachine(
    todoAppBase,
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => oimdb.effect(() => showCounts(c)));
            effect((c) => oimdb.effect(() => showFilter(c)));
            effect((c) => oimdb.effect(() => showRows(c)));
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(ports.draftKeydown, (c, event) => {
                if (event.key !== 'Enter') return;
                const title = (readExoControlValue(event.target) as string).trim();
                if (title === '') return;
                injectTodoCns(c).stimulate(TodoUiAxon.newTodoEntered.createSignal({ title }));
                c.attr(ports.draft, '');
            });

            for (const { filter, clickPort } of filterLinks) {
                on(clickPort, (c, event) => {
                    event.preventDefault();
                    injectTodoCns(c).stimulate(
                        TodoUiAxon.filterLinkClicked.createSignal({ filter })
                    );
                });
            }

            on(ports.clearCompleted, (c) => {
                injectTodoCns(c).stimulate(TodoUiAxon.clearCompletedClicked.createSignal());
            });
        })
);
