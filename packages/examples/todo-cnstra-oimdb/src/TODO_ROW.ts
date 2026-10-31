import { createExoMachineBuilder, createExoSchema, swapExoParams, wireExoNode } from '@exodra/core';
import type { TExoAttrPort, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { OIMEffectService } from '@oimdb/core';
import { todoDb } from './todoDb';
import type { TTodoRowParams } from './types/TTodoRowParams';
import type { TTodoRowState } from './types/TTodoRowState';

const TODO_ROW_SCHEMA = createExoSchema((b) => {
    let className!: TExoAttrPort;
    let id!: TExoAttrPort;
    let done!: TExoAttrPort;
    let title!: TExoTextPort;
    let draft!: TExoAttrPort;
    b.el('li', null, (li) => {
        className = li.port('class');
        id = li.port('data-id');
        li.el('div', { class: 'view' }, (view) => {
            view.el('input', { class: 'toggle', type: 'checkbox' }, (input) => {
                done = input.port('checked');
            });
            view.el('label', null, (label) => {
                title = label.textPort();
            });
            view.el('button', { class: 'destroy', type: 'button' });
        });
        li.el('input', { class: 'edit' }, (input) => {
            draft = input.port('value');
        });
    });
    return { className, id, done, title, draft };
});
const P = TODO_ROW_SCHEMA.ports;

const mTodoRow = createExoMachineBuilder<TExoMachineNode, TTodoRowParams, TTodoRowState>(
    TODO_ROW_SCHEMA
);

mTodoRow.createInitialState(
    (): TTodoRowState => ({
        id: null,
        title: null,
        done: null,
        editing: false,
        className: undefined,
    })
);

mTodoRow.wire((c, params) => {
    swapExoParams(c, params);
    const todo = params.slot.entity;
    if (todo === undefined) return;
    const shown = c.state;
    if (shown.id !== todo.id) {
        shown.id = todo.id;
        c.attr(P.id, todo.id);
    }
    if (shown.title !== todo.title) {
        shown.title = todo.title;
        c.text(P.title, todo.title);
    }
    if (shown.done !== todo.done) {
        shown.done = todo.done;
        c.attr(P.done, todo.done);
    }
    if (params.editing && !shown.editing) c.attr(P.draft, todo.title);
    shown.editing = params.editing;
    const className = rowClassOf(todo.done, params.editing);
    if (shown.className !== className) {
        shown.className = className;
        c.attr(P.className, className);
    }
});

mTodoRow.effect((c) =>
    OIMEffectService.INSTANCE.subscribeEffect(
        todoDb.db,
        () => wireExoNode(c, TODO_ROW, c.serviceState as TTodoRowParams),
        [(c.serviceState as TTodoRowParams).slot]
    )
);

export const TODO_ROW = mTodoRow.done();

function rowClassOf(done: boolean, editing: boolean): string | undefined {
    if (editing) return done ? 'completed editing' : 'editing';
    return done ? 'completed' : undefined;
}
