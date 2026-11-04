import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    createExoMachine,
    composeExoMachine,
    withExoHandlers,
    createExoSchema,
    exoEventPortKind,
    exoPorts,
    exoRefPortKind,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoControlValue } from '@exodra/forms';
import { withOIMEffects } from '@oimdb/exodra';
import { TodoUiAxon } from './TodoUiAxon';
import { injectCNS, withCNSReceptors } from '@cnstra/exodra';
import type { TTodoRowState } from './types/TTodoRowState';
import type { TTodoServices } from './types/TTodoServices';
import type { TTodoSlot } from './types/TTodoSlot';

const TodoRowPorts = exoPorts({
    CLASS_NAME: EXO_PORT_ATTR,
    DONE: EXO_PORT_ATTR,
    TOGGLE: EXO_PORT_EVENT,
    TITLE: EXO_PORT_TEXT,
    EDIT: EXO_PORT_EVENT,
    DESTROY: EXO_PORT_EVENT,
    DRAFT: EXO_PORT_ATTR,
    DRAFT_FIELD: exoRefPortKind<HTMLInputElement>(),
    DRAFT_KEYDOWN: exoEventPortKind<KeyboardEvent>(),
    DRAFT_FOCUSOUT: EXO_PORT_EVENT,
});

const TodoRowSchema = createExoSchema(TodoRowPorts, (b) => {
    b.el('li', null, (li) => {
        li.attrPort(TodoRowPorts.CLASS_NAME, 'class');
        li.el('div', { class: 'view' }, (view) => {
            view.el('input', { class: 'toggle', type: 'checkbox' }, (input) => {
                input.attrPort(TodoRowPorts.DONE, 'checked');
                input.eventPort(TodoRowPorts.TOGGLE, 'change');
            });
            view.el('label', null, (label) => {
                label.textPort(TodoRowPorts.TITLE);
                label.eventPort(TodoRowPorts.EDIT, 'dblclick');
            });
            view.el('button', { class: 'destroy', type: 'button' }, (button) => {
                button.eventPort(TodoRowPorts.DESTROY, 'click');
            });
        });
        li.el('input', { class: 'edit' }, (input) => {
            input.attrPort(TodoRowPorts.DRAFT, 'value');
            input.refPort(TodoRowPorts.DRAFT_FIELD);
            input.eventPort(TodoRowPorts.DRAFT_KEYDOWN, 'keydown');
            input.eventPort(TodoRowPorts.DRAFT_FOCUSOUT, 'focusout');
        });
    });
});

const todoRowBase = createExoMachine<TExoDomNode & TTodoServices, TTodoSlot, TTodoRowState>(
    TodoRowSchema,
    {
        createInitialState: (c, slot): TTodoRowState => ({
            slot,
            editing: false,
            done: false,
        }),
    }
);

function showClass(c: TExoMachineNodeOf<typeof todoRowBase>): void {
    const { done, editing } = c.state;
    c.attr(
        TodoRowPorts.CLASS_NAME,
        editing ? (done ? 'completed editing' : 'editing') : done ? 'completed' : undefined
    );
}

function showDone(c: TExoMachineNodeOf<typeof todoRowBase>, done: boolean): void {
    c.state.done = done;
    c.attr(TodoRowPorts.DONE, done);
    showClass(c);
}

function startEditing(c: TExoMachineNodeOf<typeof todoRowBase>): void {
    const state = c.state;
    state.editing = true;
    c.attr(TodoRowPorts.DRAFT, state.slot.entity?.title ?? '');
    showClass(c);
    c.portNode(TodoRowPorts.DRAFT_FIELD).focus();
}

function stopEditing(c: TExoMachineNodeOf<typeof todoRowBase>): void {
    c.state.editing = false;
    showClass(c);
}

function commitEditing(c: TExoMachineNodeOf<typeof todoRowBase>, field: EventTarget | null): void {
    const id = c.state.slot.entity?.id;
    if (!c.state.editing || id === undefined) return;
    stopEditing(c);
    const title = readExoControlValue(field) as string;
    injectCNS(c).stimulate(TodoUiAxon.titleEdited.createSignal({ id, title }));
}

export const todoRowMachine = composeExoMachine(
    todoRowBase,
    (m) =>
        withCNSReceptors(m, (receptor) => {
            receptor(TodoRowPorts.TOGGLE, TodoUiAxon.toggleClicked, (c, event) => {
                const id = c.state.slot.entity?.id;
                if (id === undefined) return undefined;
                return { id, done: readExoControlValue(event.target) as boolean };
            });
            receptor(TodoRowPorts.DESTROY, TodoUiAxon.destroyClicked, (c) => {
                const id = c.state.slot.entity?.id;
                return id === undefined ? undefined : { id };
            });
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(TodoRowPorts.EDIT, (c) => startEditing(c));
            on(TodoRowPorts.DRAFT_KEYDOWN, (c, event) => {
                if (event.key === 'Enter') commitEditing(c, event.target);
                else if (event.key === 'Escape') stopEditing(c);
            });
            on(TodoRowPorts.DRAFT_FOCUSOUT, (c, event) => commitEditing(c, event.target));
        }),
    (m) =>
        withOIMEffects(m, (effect) => {
            effect((c) => {
                const todo = c.state.slot.entity;
                if (todo !== undefined) c.text(TodoRowPorts.TITLE, todo.title);
            });
            effect((c) => {
                const todo = c.state.slot.entity;
                if (todo !== undefined) showDone(c, todo.done);
            });
        })
);
