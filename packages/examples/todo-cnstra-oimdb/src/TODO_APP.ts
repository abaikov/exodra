import { createExoMachineBuilder, createExoSchema, wireExoNode } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoEventPort, TExoTextPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { OIMEffectService } from '@oimdb/core';
import { TODO_ROW } from './TODO_ROW';
import { TODO_SIGNALS } from './TODO_SIGNALS';
import { TODO_READS } from './TODO_READS';
import { runTodoCommand } from './runTodoCommand';
import { todoDb } from './todoDb';
import type { TTodoAppState } from './types/TTodoAppState';
import type { TTodoFilter } from './types/TTodoFilter';
import type { TTodoSlot } from './types/TTodoSlot';

const TODO_FILTERS: readonly TTodoFilter[] = ['all', 'active', 'completed'];
const TODO_FILTER_LABELS: Readonly<Record<TTodoFilter, string>> = {
    all: 'All',
    active: 'Active',
    completed: 'Completed',
};

const TODO_APP_SCHEMA = createExoSchema((b) => {
    let keydown!: TExoEventPort;
    let change!: TExoEventPort;
    let click!: TExoEventPort;
    let dblclick!: TExoEventPort;
    let focusout!: TExoEventPort;
    let draft!: TExoAttrPort;
    let mainHidden!: TExoAttrPort;
    let rows!: TExoChildrenPort;
    let footerHidden!: TExoAttrPort;
    let left!: TExoTextPort;
    let leftLabel!: TExoTextPort;
    const filterClasses: TExoAttrPort[] = [];
    let clearHidden!: TExoAttrPort;
    b.el('section', { class: 'todoapp' }, (app) => {
        keydown = app.eventPort('keydown');
        change = app.eventPort('change');
        click = app.eventPort('click');
        dblclick = app.eventPort('dblclick');
        focusout = app.eventPort('focusout');
        app.el('header', { class: 'header' }, (header) => {
            header.el('h1', null, (h1) => {
                h1.text('todos');
            });
            header.el(
                'input',
                { class: 'new-todo', placeholder: 'What needs to be done?', autofocus: '' },
                (input) => {
                    draft = input.port('value');
                }
            );
        });
        app.el('section', { class: 'main' }, (main) => {
            mainHidden = main.port('hidden');
            main.el('ul', { class: 'todo-list' }, (ul) => {
                rows = ul.childrenPort();
            });
        });
        app.el('footer', { class: 'footer' }, (footer) => {
            footerHidden = footer.port('hidden');
            footer.el('span', { class: 'todo-count' }, (count) => {
                count.el('strong', null, (strong) => {
                    left = strong.textPort();
                });
                count.el('span', null, (label) => {
                    leftLabel = label.textPort();
                });
            });
            footer.el('ul', { class: 'filters' }, (ul) => {
                for (const filter of TODO_FILTERS) {
                    ul.el('li', null, (li) => {
                        li.el('a', { href: `#/${filter}`, 'data-filter': filter }, (a) => {
                            filterClasses.push(a.port('class'));
                            a.text(TODO_FILTER_LABELS[filter]);
                        });
                    });
                }
            });
            footer.el('button', { class: 'clear-completed', type: 'button' }, (button) => {
                clearHidden = button.port('hidden');
                button.text('Clear completed');
            });
        });
    });
    return {
        keydown,
        change,
        click,
        dblclick,
        focusout,
        draft,
        mainHidden,
        rows,
        footerHidden,
        left,
        leftLabel,
        filterClasses,
        clearHidden,
    };
});
const P = TODO_APP_SCHEMA.ports;

type TTodoAppNode = TExoDomNode & { state: TTodoAppState };

const mTodoApp = createExoMachineBuilder<TExoDomNode, unknown, TTodoAppState>(TODO_APP_SCHEMA);

mTodoApp.createInitialState(
    (c): TTodoAppState => ({
        rows: c.childList(P.rows),
        rowsBySlot: new WeakMap(),
        shown: [],
        editing: null,
    })
);

const showCounts = mTodoApp.transition((c) => {
    const { active, done } = TODO_READS.counts();
    const empty = active + done === 0;
    c.text(P.left, active);
    c.text(P.leftLabel, active === 1 ? ' item left' : ' items left');
    c.attr(P.mainHidden, empty);
    c.attr(P.footerHidden, empty);
    c.attr(P.clearHidden, done === 0);
});

const showFilter = mTodoApp.transition((c) => {
    const current = TODO_READS.filter();
    TODO_FILTERS.forEach((filter, at) => {
        c.attr(P.filterClasses[at], filter === current ? 'selected' : undefined);
    });
});

const clearDraft = mTodoApp.transition((c) => {
    c.attr(P.draft, '');
});

const stopEditing = mTodoApp.transition((c) => {
    const slot = c.state.editing;
    if (slot === null) return;
    c.state.editing = null;
    const row = c.state.rowsBySlot.get(slot);
    if (row !== undefined) wireExoNode(row, TODO_ROW, { slot, editing: false });
});

const startEditing = mTodoApp.transition<TTodoSlot>((c, slot) => {
    stopEditing(c);
    const row = c.state.rowsBySlot.get(slot);
    if (row === undefined) return;
    c.state.editing = slot;
    wireExoNode(row, TODO_ROW, { slot, editing: true });
});

const showRows = mTodoApp.transition((c) => {
    const state = c.state;
    const want = TODO_READS.visibleTodoSlots();
    state.shown = reconcileExoOrder(state.rows, state.shown, want, want, (slot, at) => {
        const row = c.build(TODO_ROW, at, { slot, editing: state.editing === slot });
        state.rowsBySlot.set(slot, row);
        return row;
    });
});

mTodoApp.effect((c) => {
    showCounts(c);
    return OIMEffectService.INSTANCE.subscribeEffect(
        todoDb.db,
        () => showCounts(c),
        TODO_READS.countSlots
    );
});

mTodoApp.effect((c) => {
    showFilter(c);
    return OIMEffectService.INSTANCE.subscribeEffect(
        todoDb.db,
        () => showFilter(c),
        TODO_READS.filterSlots
    );
});

mTodoApp.effect((c) => {
    showRows(c);
    return OIMEffectService.INSTANCE.subscribeEffect(
        todoDb.db,
        () => showRows(c),
        TODO_READS.visibleSlots
    );
});

mTodoApp.on(P.keydown, (c, event) => {
    const field = event.target as Element;
    const key = (event as KeyboardEvent).key;
    if (field.classList.contains('new-todo')) {
        if (key !== 'Enter') return;
        const title = (readExoControlValue(field) as string).trim();
        if (title === '') return;
        runTodoCommand(TODO_SIGNALS.addTodo.createSignal({ title }));
        clearDraft(c);
    } else if (field.classList.contains('edit')) {
        if (key === 'Enter') commitEditing(c, readExoControlValue(field) as string);
        else if (key === 'Escape') stopEditing(c);
    }
});

mTodoApp.on(P.focusout, (c, event) => {
    const field = event.target as Element;
    if (field.classList.contains('edit')) commitEditing(c, readExoControlValue(field) as string);
});

mTodoApp.on(P.change, (_c, event) => {
    const box = event.target as Element;
    if (!box.classList.contains('toggle')) return;
    const id = todoIdOf(box);
    if (id === null) return;
    runTodoCommand(
        TODO_SIGNALS.toggleTodo.createSignal({ id, done: readExoControlValue(box) as boolean })
    );
});

mTodoApp.on(P.dblclick, (c, event) => {
    const label = event.target as Element;
    if (label.localName !== 'label') return;
    const id = todoIdOf(label);
    const slot = id === null ? undefined : todoDb.todoService.findSlotByKey(todoDb.todos, id);
    if (slot === undefined) return;
    startEditing(c, slot);
    label.closest('li')?.querySelector<HTMLInputElement>('input.edit')?.focus();
});

mTodoApp.on(P.click, (_c, event) => {
    const target = event.target as Element;
    if (target.classList.contains('destroy')) {
        const id = todoIdOf(target);
        if (id !== null) runTodoCommand(TODO_SIGNALS.removeTodo.createSignal({ id }));
        return;
    }
    if (target.classList.contains('clear-completed')) {
        runTodoCommand(TODO_SIGNALS.clearCompletedTodos.createSignal());
        return;
    }
    const link = target.closest('a[data-filter]');
    if (link === null) return;
    event.preventDefault();
    const filter = link.getAttribute('data-filter') as TTodoFilter;
    runTodoCommand(TODO_SIGNALS.showTodoFilter.createSignal({ filter }));
});

export const TODO_APP = mTodoApp.done();

function commitEditing(c: TTodoAppNode, title: string): void {
    const todo = c.state.editing?.entity;
    if (todo === undefined) return;
    stopEditing(c);
    runTodoCommand(TODO_SIGNALS.editTodoTitle.createSignal({ id: todo.id, title }));
}

function todoIdOf(target: Element): string | null {
    return target.closest('li[data-id]')?.getAttribute('data-id') ?? null;
}
