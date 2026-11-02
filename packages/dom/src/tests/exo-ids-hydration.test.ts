// @vitest-environment jsdom
import { createExoMachine, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoMachineNode } from '@exodra/core';
import { nextExoId, provideExoIds } from '@exodra/context';
import { ExoStrBackend } from '@exodra/string';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../dom/ExoDomBackend';
import { withExoCompiler } from '../dom/withExoCompiler';
import { withExoHydration } from '../hydrate/withExoHydration';
import type { TExoDomNode } from '../dom/EXO_DOM_NODE_VOCABULARY';

const FIELD_SCHEMA = createExoSchema((b) => {
    let labelFor!: TExoAttrPort;
    let inputId!: TExoAttrPort;
    b.el('p', null, (p) => {
        p.el('label', null, (label) => {
            labelFor = label.port('for');
        });
        p.el('input', null, (input) => {
            inputId = input.port('id');
        });
    });
    return { labelFor, inputId };
});
const mField = createExoMachine<TExoMachineNode>(FIELD_SCHEMA, {
    createInitialState: (c) => {
        const id = nextExoId(c);
        c.attr(FIELD_SCHEMA.ports.labelFor, id);
        c.attr(FIELD_SCHEMA.ports.inputId, id);
    },
});
const FIELD = mField;

const FORM_SCHEMA = createExoSchema((b) => {
    let fields!: TExoChildrenPort;
    b.el('form', null, (f) => {
        fields = f.childrenPort();
    });
    return { fields };
});
const mForm = createExoMachine<TExoDomNode>(FORM_SCHEMA, {
    createInitialState: (c) => {
        provideExoIds(c, 'form');
        c.list(FORM_SCHEMA.ports.fields, FIELD as never, Array.from({ length: 3 }));
    },
});
const FORM = mForm;

const BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));

describe('ids from nextExoId survive the trip from the server to hydration', () => {
    it('the server prints the ids a client render would give', () => {
        const parent = document.createElement('div');
        BACKEND.render(FORM as never, parent);
        expect(new ExoStrBackend().render(FORM as never)).toBe(parent.innerHTML);
        expect(Array.from(parent.querySelectorAll('input')).map((i) => i.id)).toEqual([
            'form-0',
            'form-1',
            'form-2',
        ]);
    });

    it('hydration counts to the same ids and writes nothing', () => {
        const parent = document.createElement('div');
        parent.innerHTML = new ExoStrBackend().render(FORM as never);
        const served = parent.innerHTML;
        const inputs = Array.from(parent.querySelectorAll('input'));
        BACKEND.hydrate(FORM as never, parent);
        expect(parent.innerHTML).toBe(served);
        expect(Array.from(parent.querySelectorAll('input'))).toEqual(inputs);
    });
});
