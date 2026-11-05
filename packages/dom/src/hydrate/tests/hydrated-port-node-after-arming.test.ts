// @vitest-environment jsdom
import {
    createExoMachine,
    createExoSchema,
    exoEventPortKind,
    exoPorts,
    exoRefPortKind,
    withExoHandlers,
} from '@exodra/core';
import { host } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

const PickerPorts = exoPorts({
    FIELD: exoRefPortKind<HTMLInputElement>(),
    PICK: exoEventPortKind<MouseEvent>(),
});

const PickerSchema = createExoSchema(PickerPorts, (b) => {
    b.el('div', { class: 'picker' }, (div) => {
        div.el('input', { type: 'text' }, (input) => {
            input.refPort(PickerPorts.FIELD);
        });
        div.el('button', null, (button) => {
            button.eventPort(PickerPorts.PICK, 'click');
            button.text('pick');
        });
    });
});

let picked: Element[] = [];

const pickerMachine = withExoHandlers(createExoMachine<TExoDomNode>(PickerSchema), (on) => {
    on(PickerPorts.PICK, (c) => {
        picked.push(c.portNode(PickerPorts.FIELD));
    });
});

const serve = (): HTMLElement => {
    const parent = host();
    parent.innerHTML = EXO_STR.render(pickerMachine as never);
    return parent;
};

const pick = (parent: Element): void => {
    (parent.querySelector('button') as HTMLElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true })
    );
};

describe('c.portNode on a hydrated instance, called after its wire has run', () => {
    it('hands a handler the element the server printed', () => {
        picked = [];
        const parent = serve();
        const input = parent.querySelector('input') as HTMLInputElement;

        EXO_BACKEND.hydrate(pickerMachine, parent);
        pick(parent);
        pick(parent);

        expect(picked).toEqual([input, input]);
        expect(picked[0]).toBe(input);
    });

    it('leaves a client render of the same schema reading its own element', () => {
        picked = [];
        const served = serve();
        EXO_BACKEND.hydrate(pickerMachine, served);
        pick(served);

        const rendered = host();
        EXO_BACKEND.render(pickerMachine, rendered);
        pick(rendered);

        expect(picked).toHaveLength(2);
        expect(picked[0]).toBe(served.querySelector('input'));
        expect(picked[1]).toBe(rendered.querySelector('input'));
    });

    it('reads the right element when the client render filled the cache first', () => {
        picked = [];
        const rendered = host();
        EXO_BACKEND.render(pickerMachine, rendered);
        pick(rendered);

        const served = serve();
        EXO_BACKEND.hydrate(pickerMachine, served);
        pick(served);

        expect(picked).toHaveLength(2);
        expect(picked[0]).toBe(rendered.querySelector('input'));
        expect(picked[1]).toBe(served.querySelector('input'));
    });
});
