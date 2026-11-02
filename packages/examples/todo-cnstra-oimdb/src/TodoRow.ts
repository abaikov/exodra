import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    createExoMachine,
    composeExoMachine,
    withExoHandlers,
    withExoEffects,
    createExoSchema,
    exoEventPortKind,
    exoPorts,
    exoRefPortKind,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
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

const todoRowBuilder = createExoMachine<TExoDomNode, TTodoSlot, TTodoRowState>(todoRowSchema, {
    createInitialState: (c, slot): TTodoRowState => ({
        cns: injectTodoCns(c),
        slot,
        editing: false,
        done: false,
    }),
});

function showClass(c: TExoMachineNodeOf<typeof todoRowBuilder>): void {
    const { done, editing } = c.state;
    c.attr(
        ports.className,
        editing ? (done ? 'completed editing' : 'editing') : done ? 'completed' : undefined
    );
}

function showDone(c: TExoMachineNodeOf<typeof todoRowBuilder>, done: boolean): void {
    c.state.done = done;
    c.attr(ports.done, done);
    showClass(c);
}

function startEditing(c: TExoMachineNodeOf<typeof todoRowBuilder>): void {
    const state = c.state;
    state.editing = true;
    c.attr(ports.draft, state.slot.entity?.title ?? '');
    showClass(c);
    c.portNode(ports.draftField).focus();
}

function stopEditing(c: TExoMachineNodeOf<typeof todoRowBuilder>): void {
    c.state.editing = false;
    showClass(c);
}

function commitEditing(
    c: TExoMachineNodeOf<typeof todoRowBuilder>,
    field: EventTarget | null
): void {
    const id = c.state.slot.entity?.id;
    if (!c.state.editing || id === undefined) return;
    stopEditing(c);
    const title = readExoControlValue(field) as string;
    c.state.cns.stimulate(TodoUiAxon.titleEdited.createSignal({ id, title }));
}

export const TodoRow = composeExoMachine(
    todoRowBuilder,
    (m) =>
        withExoHandlers(m, (on) => {
            on(ports.toggle, (c, event) => {
                const id = c.state.slot.entity?.id;
                if (id === undefined) return;
                const done = readExoControlValue(event.target) as boolean;
                c.state.cns.stimulate(TodoUiAxon.toggleClicked.createSignal({ id, done }));
            });
            on(ports.destroy, (c) => {
                const id = c.state.slot.entity?.id;
                if (id !== undefined)
                    c.state.cns.stimulate(TodoUiAxon.destroyClicked.createSignal({ id }));
            });
            on(ports.edit, (c) => startEditing(c));
            on(ports.draftKeydown, (c, event) => {
                if (event.key === 'Enter') commitEditing(c, event.target);
                else if (event.key === 'Escape') stopEditing(c);
            });
            on(ports.draftFocusout, (c, event) => commitEditing(c, event.target));
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) =>
                oimdb.effect(() => {
                    const todo = c.state.slot.readEntity(titleColumn);
                    if (todo !== undefined) c.text(ports.title, todo.title);
                })
            );
            effect((c) =>
                oimdb.effect(() => {
                    const todo = c.state.slot.readEntity(doneColumn);
                    if (todo !== undefined) showDone(c, todo.done);
                })
            );
        })
);
