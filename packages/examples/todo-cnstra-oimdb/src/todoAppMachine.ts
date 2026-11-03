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
import { todoRowMachine } from './todoRowMachine';
import { TodoUiAxon } from './TodoUiAxon';
import { TodoEnvironment } from './TodoEnvironment';
import { withExoOimBucketList } from './withExoOimBucketList';
import type { TTodoBucket } from './types/TTodoBucket';
import type { TTodoServices } from './types/TTodoServices';
import type { TTodoAppState } from './types/TTodoAppState';
import type { TTodoDb } from './types/TTodoDb';
import type { TTodoFilter } from './types/TTodoFilter';

const TodoAppPorts = exoPorts({
    DRAFT: EXO_PORT_ATTR,
    DRAFT_KEYDOWN: exoEventPortKind<KeyboardEvent>(),
    MAIN_HIDDEN: EXO_PORT_ATTR,
    TOGGLE_ALL: EXO_PORT_ATTR,
    TOGGLE_ALL_CHANGE: EXO_PORT_EVENT,
    ROWS: EXO_PORT_CHILDREN,
    EMPTY_HIDDEN: EXO_PORT_ATTR,
    EMPTY_TEXT: EXO_PORT_TEXT,
    FOOTER_HIDDEN: EXO_PORT_ATTR,
    LEFT: EXO_PORT_TEXT,
    LEFT_LABEL: EXO_PORT_TEXT,
    ALL_FILTER_CLASS: EXO_PORT_ATTR,
    ACTIVE_FILTER_CLASS: EXO_PORT_ATTR,
    COMPLETED_FILTER_CLASS: EXO_PORT_ATTR,
    ALL_FILTER_CLICK: EXO_PORT_EVENT,
    ACTIVE_FILTER_CLICK: EXO_PORT_EVENT,
    COMPLETED_FILTER_CLICK: EXO_PORT_EVENT,
    CLEAR_HIDDEN: EXO_PORT_ATTR,
    CLEAR_COMPLETED: EXO_PORT_EVENT,
});

const filterLinks: readonly {
    filter: TTodoFilter;
    label: string;
    empty: string;
    classPort: TExoAttrPort;
    clickPort: TExoEventPort;
}[] = [
    {
        filter: 'all',
        label: 'All',
        empty: 'Nothing to do yet.',
        classPort: TodoAppPorts.ALL_FILTER_CLASS,
        clickPort: TodoAppPorts.ALL_FILTER_CLICK,
    },
    {
        filter: 'active',
        label: 'Active',
        empty: 'All done.',
        classPort: TodoAppPorts.ACTIVE_FILTER_CLASS,
        clickPort: TodoAppPorts.ACTIVE_FILTER_CLICK,
    },
    {
        filter: 'completed',
        label: 'Completed',
        empty: 'Nothing completed yet.',
        classPort: TodoAppPorts.COMPLETED_FILTER_CLASS,
        clickPort: TodoAppPorts.COMPLETED_FILTER_CLICK,
    },
];

const TodoAppSchema = createExoSchema(TodoAppPorts, (b) => {
    b.el('section', { class: 'todoapp' }, (app) => {
        app.el('header', { class: 'header' }, (header) => {
            header.el('h1', null, (h1) => {
                h1.text('todos');
            });
            header.el(
                'input',
                { class: 'new-todo', placeholder: 'What needs to be done?', autofocus: '' },
                (input) => {
                    input.attrPort(TodoAppPorts.DRAFT, 'value');
                    input.eventPort(TodoAppPorts.DRAFT_KEYDOWN, 'keydown');
                }
            );
        });
        app.el('section', { class: 'main' }, (main) => {
            main.attrPort(TodoAppPorts.MAIN_HIDDEN, 'hidden');
            main.el(
                'input',
                { id: 'toggle-all', class: 'toggle-all', type: 'checkbox' },
                (input) => {
                    input.attrPort(TodoAppPorts.TOGGLE_ALL, 'checked');
                    input.eventPort(TodoAppPorts.TOGGLE_ALL_CHANGE, 'change');
                }
            );
            main.el('label', { for: 'toggle-all' }, (label) => {
                label.text('Mark all as complete');
            });
            main.el('ul', { class: 'todo-list' }, (ul) => {
                ul.childrenPort(TodoAppPorts.ROWS);
            });
            main.el('p', { class: 'empty' }, (p) => {
                p.attrPort(TodoAppPorts.EMPTY_HIDDEN, 'hidden');
                p.textPort(TodoAppPorts.EMPTY_TEXT);
            });
        });
        app.el('footer', { class: 'footer' }, (footer) => {
            footer.attrPort(TodoAppPorts.FOOTER_HIDDEN, 'hidden');
            footer.el('span', { class: 'todo-count' }, (count) => {
                count.el('strong', null, (strong) => {
                    strong.textPort(TodoAppPorts.LEFT);
                });
                count.el('span', null, (label) => {
                    label.textPort(TodoAppPorts.LEFT_LABEL);
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
                button.attrPort(TodoAppPorts.CLEAR_HIDDEN, 'hidden');
                button.eventPort(TodoAppPorts.CLEAR_COMPLETED, 'click');
                button.text('Clear completed');
            });
        });
    });
});

const todoAppBase = createExoMachine<TExoDomNode & TTodoServices, unknown, TTodoAppState>(
    TodoAppSchema,
    {
        createInitialState: (c): TTodoAppState => ({ rows: c.childList(TodoAppPorts.ROWS) }),
    }
);

function shownFilter(db: TTodoDb): TTodoFilter {
    return db.filter.getSingleSlot().entity?.filter ?? 'all';
}

function shownBucket(db: TTodoDb, filter: TTodoFilter): TTodoBucket {
    if (filter === 'all') return db.todosInOrder.getSlotByKey('all');
    return db.todosByDone.getSlotByKey(filter === 'active' ? 'active' : 'done');
}

function showCounts(c: TExoMachineNodeOf<typeof todoAppBase>): void {
    const db = c.todoDb;
    const active = db.todosByDone.getSlotByKey('active').getBucketMemberSlotCount();
    const done = db.todosByDone.getSlotByKey('done').getBucketMemberSlotCount();
    const empty = active + done === 0;
    c.text(TodoAppPorts.LEFT, active);
    c.text(TodoAppPorts.LEFT_LABEL, active === 1 ? ' item left' : ' items left');
    c.attr(TodoAppPorts.MAIN_HIDDEN, empty);
    c.attr(TodoAppPorts.FOOTER_HIDDEN, empty);
    c.attr(TodoAppPorts.CLEAR_HIDDEN, done === 0);
    c.attr(TodoAppPorts.TOGGLE_ALL, !empty && active === 0);
}

function showFilter(c: TExoMachineNodeOf<typeof todoAppBase>): void {
    const current = shownFilter(c.todoDb);
    const shownCount = shownBucket(c.todoDb, current).getBucketMemberSlotCount();
    for (const { filter, classPort, empty } of filterLinks) {
        c.attr(classPort, filter === current ? 'selected' : undefined);
        if (filter === current) c.text(TodoAppPorts.EMPTY_TEXT, empty);
    }
    c.attr(TodoAppPorts.EMPTY_HIDDEN, shownCount !== 0);
}

export const todoAppMachine = composeExoMachine(
    todoAppBase,
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => c.oimdb.createEffect(() => showCounts(c)));
            effect((c) => c.oimdb.createEffect(() => showFilter(c)));
        }),
    (m) =>
        withExoOimBucketList(m, {
            rows: (c) => c.state.rows,
            cell: (c) => c.todoRowCell,
            row: todoRowMachine,
            bucket: (c) => shownBucket(c.todoDb, shownFilter(c.todoDb)),
            reselectOn: (c) => [c.todoDb.filter.getSingleSlot()],
        }),
    (m) =>
        TodoEnvironment.withReceptors(m, (receptor) => {
            receptor(TodoAppPorts.TOGGLE_ALL_CHANGE, TodoUiAxon.toggleAllClicked, (c, event) => ({
                done: readExoControlValue(event.target) as boolean,
            }));
            for (const { filter, clickPort } of filterLinks) {
                receptor(clickPort, TodoUiAxon.filterLinkClicked, (c, event) => {
                    event.preventDefault();
                    return { filter };
                });
            }
            receptor(TodoAppPorts.CLEAR_COMPLETED, TodoUiAxon.clearCompletedClicked);
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(TodoAppPorts.DRAFT_KEYDOWN, (c, event) => {
                if (event.key !== 'Enter') return;
                const title = (readExoControlValue(event.target) as string).trim();
                if (title === '') return;
                TodoEnvironment.cnsOf(c).stimulate(
                    TodoUiAxon.newTodoEntered.createSignal({ title })
                );
                c.attr(TodoAppPorts.DRAFT, '');
            });
        })
);
