import {
    EXO_PORT_EVENT,
    EXO_PORT_REF,
    createExoMachine,
    createExoSchema,
    exoEventPortKind,
    exoPorts,
    exoRefPortKind,
    withExoHandlers,
} from '@exodra/core';
import type { TExoEventPort, TExoMachineNodeOf, TExoRefPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

const FieldPorts = exoPorts({
    keydown: exoEventPortKind<KeyboardEvent>(),
    click: EXO_PORT_EVENT,
    field: exoRefPortKind<HTMLInputElement>(),
    box: EXO_PORT_REF,
});

const typedKeydown: TExoEventPort<KeyboardEvent> = FieldPorts.keydown;
const typedField: TExoRefPort<HTMLInputElement> = FieldPorts.field;
const anyEvent: TExoEventPort = FieldPorts.keydown;
const anyRef: TExoRefPort = FieldPorts.field;
void typedKeydown;
void typedField;
void anyEvent;
void anyRef;

const fieldSchema = createExoSchema(FieldPorts, (b) => {
    b.el('input', null, (input) => {
        input.eventPort(FieldPorts.keydown, 'keydown');
        input.eventPort(FieldPorts.click, 'click');
        input.refPort(FieldPorts.field);
        input.refPort(FieldPorts.box);
    });
});

const fieldBase = createExoMachine<TExoDomNode, { label: string }, { label: string }>(fieldSchema, {
    createInitialState: (_c, params) => ({ label: params.label }),
});

withExoHandlers(fieldBase, (on) => {
    on(FieldPorts.keydown, (c, event) => {
        const key: string = event.key;
        const input: HTMLInputElement = c.portNode(FieldPorts.field);
        const box: Element = c.portNode(FieldPorts.box);
        void key;
        void input;
        void box;
    });

    on(FieldPorts.click, (_c, event) => {
        const plain: Event = event;
        // @ts-expect-error an untyped port hands the backend's Event, which has no `key`
        void event.key;
        void plain;
    });

    // @ts-expect-error a ref port is not an event port
    on(FieldPorts.field, () => {});
});

type TFieldNode = TExoMachineNodeOf<typeof fieldBase>;

function showLabel(c: TFieldNode): void {
    const label: string = c.state.label;
    void label;
}
void showLabel;
