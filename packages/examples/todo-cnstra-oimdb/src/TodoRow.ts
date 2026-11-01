import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    createExoMachineBuilder,
    createExoSchema,
    exoEventPortKind,
    exoPorts,
    exoRefPortKind,
} from '@exodra/core';
import type { TExoMachineBuilderNode } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';
import type { TOIMColumnGroup } from '@oimdb/core';
import * as oimdb from '@oimdb/core/oimdb';
import { injectTodoCns } from './injectTodoCns';
import { TodoUiAxon } from './TodoUiAxon';
import type { TTodoRowState } from './types/TTodoRowState';
import type { TTodoSlot } from './types/TTodoSlot';

const ports = exoPorts({
    className: EXO_PORT_ATTR,
    done: EXO_PORT_ATTR,
    toggle: EXO_PORT_EVENT,
    title: EXO_PORT_TEXT,
    edit: EXO_PORT_EVENT,
    destroy: EXO_PORT_EVENT,
    draft: EXO_PORT_ATTR,
    draftField: exoRefPortKind<HTMLInputElement>(),
    draftKeydown: exoEventPortKind<KeyboardEvent>(),
    draftFocusout: EXO_PORT_EVENT,
});

const todoRowSchema = createExoSchema(ports, (b) => {
    b.el('li', null, (li) => {
        li.attrPort(ports.className, 'class');
        li.el('div', { class: 'view' }, (view) => {
            view.el('input', { class: 'toggle', type: 'checkbox' }, (input) => {
                input.attrPort(ports.done, 'checked');
                input.eventPort(ports.toggle, 'change');
            });
            view.el('label', null, (label) => {
                label.textPort(ports.title);
                label.eventPort(ports.edit, 'dblclick');
            });
            view.el('button', { class: 'destroy', type: 'button' }, (button) => {
                button.eventPort(ports.destroy, 'click');
            });
        });
        li.el('input', { class: 'edit' }, (input) => {
            input.attrPort(ports.draft, 'value');
            input.refPort(ports.draftField);
            input.eventPort(ports.draftKeydown, 'keydown');
            input.eventPort(ports.draftFocusout, 'focusout');
        });
    });
});

const titleColumn: TOIMColumnGroup = { key: 'title', columnNames: ['title'] };
const doneColumn: TOIMColumnGroup = { key: 'done', columnNames: ['done'] };

const todoRowBuilder = createExoMachineBuilder<TExoDomNode, TTodoSlot, TTodoRowState>(
    todoRowSchema
);

todoRowBuilder.createInitialState(
    (c, _index, slot): TTodoRowState => ({
        cns: injectTodoCns(c),
        slot,
        editing: false,
        done: false,
    })
);

function showClass(c: TExoMachineBuilderNode<typeof todoRowBuilder>): void {
    const { done, editing } = c.state;
    c.attr(
        ports.className,
        editing ? (done ? 'completed editing' : 'editing') : done ? 'completed' : undefined
    );
}

function showDone(c: TExoMachineBuilderNode<typeof todoRowBuilder>, done: boolean): void {
    c.state.done = done;
    c.attr(ports.done, done);
    showClass(c);
}

function startEditing(c: TExoMachineBuilderNode<typeof todoRowBuilder>): void {
    const state = c.state;
    state.editing = true;
    c.attr(ports.draft, state.slot.entity?.title ?? '');
    showClass(c);
    c.portNode(ports.draftField).focus();
}

function stopEditing(c: TExoMachineBuilderNode<typeof todoRowBuilder>): void {
    c.state.editing = false;
    showClass(c);
}

function commitEditing(
    c: TExoMachineBuilderNode<typeof todoRowBuilder>,
    field: EventTarget | null
): void {
    const id = c.state.slot.entity?.id;
    if (!c.state.editing || id === undefined) return;
    stopEditing(c);
    const title = readExoControlValue(field) as string;
    c.state.cns.stimulate(TodoUiAxon.titleEdited.createSignal({ id, title }));
}

todoRowBuilder.effect((c) =>
    oimdb.effect(() => {
        const todo = c.state.slot.readEntity(titleColumn);
        if (todo !== undefined) c.text(ports.title, todo.title);
    })
);

todoRowBuilder.effect((c) =>
    oimdb.effect(() => {
        const todo = c.state.slot.readEntity(doneColumn);
        if (todo !== undefined) showDone(c, todo.done);
    })
);

todoRowBuilder.on(ports.toggle, (c, event) => {
    const id = c.state.slot.entity?.id;
    if (id === undefined) return;
    const done = readExoControlValue(event.target) as boolean;
    c.state.cns.stimulate(TodoUiAxon.toggleClicked.createSignal({ id, done }));
});

todoRowBuilder.on(ports.destroy, (c) => {
    const id = c.state.slot.entity?.id;
    if (id !== undefined) c.state.cns.stimulate(TodoUiAxon.destroyClicked.createSignal({ id }));
});

todoRowBuilder.on(ports.edit, (c) => startEditing(c));

todoRowBuilder.on(ports.draftKeydown, (c, event) => {
    if (event.key === 'Enter') commitEditing(c, event.target);
    else if (event.key === 'Escape') stopEditing(c);
});

todoRowBuilder.on(ports.draftFocusout, (c, event) => commitEditing(c, event.target));

export const TodoRow = todoRowBuilder.done();
