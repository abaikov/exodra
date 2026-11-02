// @vitest-environment jsdom
import { createExoMachine, createExoSchema, withExoHandlers } from '@exodra/core';
import type { TExoEventPort, TExoRefPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import type { TExoStrNode } from '@exodra/string';
import { host } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { checkExoControlValues, readExoControlValues, setExoControlErrors } from '../../index';
import type { TExoControlRule } from '../../index';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

const requiredName: TExoControlRule = (value) => (value === '' ? 'Name is required' : null);
const adultAge: TExoControlRule = (value) =>
    typeof value === 'number' && value >= 18 ? null : 'Must be 18 or older';
const RULES = [requiredName, adultAge];

const FORM = createExoSchema((b) => {
    let name!: TExoRefPort;
    let age!: TExoRefPort;
    let submit!: TExoEventPort;
    let error!: TExoTextPort;
    b.el('form', { novalidate: '' }, (f) => {
        submit = f.eventPort('submit');
        f.el('input', { type: 'text', name: 'name' }, (i) => {
            name = i.refPort();
        });
        f.el('input', { type: 'number', name: 'age' }, (i) => {
            age = i.refPort();
        });
        f.el('p', null, (p) => {
            error = p.textPort();
        });
    });
    return { name, age, submit, error };
});
const FIELDS = [FORM.ports.name, FORM.ports.age];

function mountForm(): { parent: HTMLElement; submitted: unknown[][]; submit: () => void } {
    const submitted: unknown[][] = [];
    const Form = withExoHandlers(createExoMachine<TExoDomNode>(FORM), (on) => {
        on(FORM.ports.submit, (c, event) => {
            event.preventDefault();
            const values = readExoControlValues(c, FIELDS);
            const errors = checkExoControlValues(values, RULES);
            setExoControlErrors(c, FIELDS, errors);
            c.text(FORM.ports.error, errors.filter((e) => e !== null).join(' · '));
            if (errors.every((e) => e === null)) submitted.push(values);
        });
    });
    const parent = host();
    EXO_BACKEND.render(Form, parent);
    const submit = (): void => {
        (parent.querySelector('form') as HTMLFormElement).dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        );
    };
    return { parent, submitted, submit };
}

describe('checkExoControlValues — rules over values, no document needed', () => {
    it('answers one error or null per rule, and a null rule checks nothing', () => {
        expect(checkExoControlValues(['', 12], RULES)).toEqual([
            'Name is required',
            'Must be 18 or older',
        ]);
        expect(checkExoControlValues(['Ada', 36], RULES)).toEqual([null, null]);
        expect(checkExoControlValues(['', 12], [null, adultAge])).toEqual([
            null,
            'Must be 18 or older',
        ]);
    });

    it('hands every rule all the values, so a rule can compare two fields', () => {
        const confirm: TExoControlRule = (value, values) =>
            value === values[0] ? null : 'Passwords differ';
        expect(checkExoControlValues(['a', 'b'], [null, confirm])).toEqual([
            null,
            'Passwords differ',
        ]);
    });
});

describe('setExoControlErrors — the errors reach the browser as the controls own validity', () => {
    it('marks the failing controls invalid with the rule text, and blocks the submit', () => {
        const { parent, submitted, submit } = mountForm();
        const [name, age] = Array.from(parent.querySelectorAll('input'));
        name.value = '';
        age.value = '12';
        submit();

        expect(name.validationMessage).toBe('Name is required');
        expect(age.validationMessage).toBe('Must be 18 or older');
        expect(name.matches(':invalid')).toBe(true);
        expect((parent.querySelector('form') as HTMLFormElement).checkValidity()).toBe(false);
        expect(parent.querySelector('p')?.textContent).toBe(
            'Name is required · Must be 18 or older'
        );
        expect(submitted).toEqual([]);
    });

    it('clears an error the next check no longer finds', () => {
        const { parent, submitted, submit } = mountForm();
        const [name, age] = Array.from(parent.querySelectorAll('input'));
        name.value = '';
        age.value = '36';
        submit();
        expect(name.validity.customError).toBe(true);

        name.value = 'Ada';
        submit();
        expect(name.validity.customError).toBe(false);
        expect(name.validationMessage).toBe('');
        expect(name.matches(':invalid')).toBe(false);
        expect(submitted).toEqual([['Ada', 36]]);
    });

    it('does nothing on a backend with no document', () => {
        const Form = createExoMachine<TExoStrNode>(FORM, {
            createInitialState: (c) => {
                setExoControlErrors(c, FIELDS, ['Name is required', null]);
                reached = true;
            },
        });
        let reached = false;
        expect(new ExoStrBackend().render(Form)).toContain('novalidate');
        expect(reached).toBe(true);
    });
});
