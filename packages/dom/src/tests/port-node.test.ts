// @vitest-environment jsdom
import {
    EXO_PORT_ATTR,
    createExoMachine,
    createExoSchema,
    exoEventPortKind,
    exoPorts,
    exoRefPortKind,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import { host } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../dom/ExoDomBackend';
import { withExoCompiler } from '../dom/withExoCompiler';
import type { TExoDomNode } from '../dom/EXO_DOM_NODE_VOCABULARY';

const backend = withExoCompiler(new ExoDomBackend());

const FieldPorts = exoPorts({
    value: EXO_PORT_ATTR,
    field: exoRefPortKind<HTMLInputElement>(),
    keydown: exoEventPortKind<KeyboardEvent>(),
});

const fieldSchema = createExoSchema(FieldPorts, (b) => {
    b.el('input', { type: 'text' }, (input) => {
        input.attrPort(FieldPorts.value, 'value');
        input.refPort(FieldPorts.field);
        input.eventPort(FieldPorts.keydown, 'keydown');
    });
});

describe('portNode', () => {
    it('hands back the element standing at a ref port', () => {
        let seen: HTMLInputElement | null = null;
        const Field = withExoWire(createExoMachine<TExoDomNode>(fieldSchema), (c) => {
            seen = c.portNode(FieldPorts.field);
        });
        const parent = host();
        backend.render(Field, parent);
        expect(seen).toBe(parent.querySelector('input'));
    });

    it('lets a handler focus the field without a cast', () => {
        const keys: string[] = [];
        const Field = withExoHandlers(createExoMachine<TExoDomNode>(fieldSchema), (on) => {
            on(FieldPorts.keydown, (c, event) => {
                keys.push(event.key);
                c.portNode(FieldPorts.field).focus();
            });
        });
        const parent = host();
        backend.render(Field, parent);
        const input = parent.querySelector('input') as HTMLInputElement;
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(keys).toEqual(['Enter']);
        expect(document.activeElement).toBe(input);
    });
});
