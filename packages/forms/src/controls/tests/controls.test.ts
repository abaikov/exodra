// @vitest-environment jsdom
import {
    createExoMachine,
    composeExoMachine,
    withExoWire,
    withExoHandlers,
    withExoEffects,
    createExoSchema,
    wireExoNode,
} from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoMachineNode,
    TExoNode,
    TExoRefPort,
    TExoTextPort,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import type { TExoStrNode } from '@exodra/string';
import { host } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { readExoControlValue, readExoControlValues, writeExoChoice } from '../../index';
import type { TExoControlValue } from '../../index';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

const typeInto = (control: HTMLInputElement | HTMLTextAreaElement, value: string): void => {
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('one listener on a container, any control inside it', () => {
    const PANEL = createExoSchema((b) => {
        let input!: TExoEventPort;
        let change!: TExoEventPort;
        let echo!: TExoTextPort;
        b.el('div', { class: 'panel' }, (d) => {
            input = d.eventPort('input');
            change = d.eventPort('change');
            d.el('input', { type: 'text', name: 'title' });
            d.el('input', { type: 'number', name: 'count' });
            d.el('input', { type: 'checkbox', name: 'done' });
            d.el('textarea', { name: 'note' });
            d.el('select', { name: 'size' }, (s) => {
                s.el('option', { value: 's' }, (o) => o.text('S'));
                s.el('option', { value: 'm' }, (o) => o.text('M'));
            });
            d.el('select', { name: 'tags', multiple: '' }, (s) => {
                s.el('option', { value: 'a' }, (o) => o.text('A'));
                s.el('option', { value: 'b' }, (o) => o.text('B'));
            });
            d.el('p', null, (p) => {
                echo = p.textPort();
            });
        });
        return { input, change, echo };
    });

    const mount = () => {
        const seen: Record<string, TExoControlValue | undefined> = {};
        const record = (c: TExoDomNode, event: Event): void => {
            const target = event.target as HTMLInputElement;
            seen[target.name] = readExoControlValue(target);
            c.text(PANEL.ports.echo, target.name);
        };
        const Panel = withExoHandlers(createExoMachine<TExoDomNode>(PANEL), (on) => {
            on(PANEL.ports.input, record);
            on(PANEL.ports.change, record);
        });
        const parent = host();
        EXO_BACKEND.render(Panel, parent);
        const control = <T extends Element>(name: string): T =>
            parent.querySelector(`[name="${name}"]`) as T;
        return { seen, parent, control };
    };

    it('reads text, a textarea and a single select as strings', () => {
        const { seen, control } = mount();
        typeInto(control<HTMLInputElement>('title'), 'hello');
        typeInto(control<HTMLTextAreaElement>('note'), 'a note');
        const size = control<HTMLSelectElement>('size');
        size.value = 'm';
        size.dispatchEvent(new Event('change', { bubbles: true }));

        expect(seen).toEqual({ title: 'hello', note: 'a note', size: 'm' });
    });

    it('reads a number field as a number, and an unfinished one as NaN', () => {
        const { seen, control } = mount();
        typeInto(control<HTMLInputElement>('count'), '42');
        expect(seen.count).toBe(42);
        typeInto(control<HTMLInputElement>('count'), '');
        expect(seen.count).toBeNaN();
    });

    it('reads a checkbox as a boolean and a multiple select as every chosen value', () => {
        const { seen, control } = mount();
        control<HTMLInputElement>('done').click();
        const tags = control<HTMLSelectElement>('tags');
        tags.options[0].selected = true;
        tags.options[1].selected = true;
        tags.dispatchEvent(new Event('change', { bubbles: true }));

        expect(seen.done).toBe(true);
        expect(seen.tags).toEqual(['a', 'b']);
    });

    it('lets the transition write what depends on the value, and nothing else', () => {
        const { parent, control } = mount();
        typeInto(control<HTMLInputElement>('title'), 'x');
        expect(parent.querySelector('p')?.textContent).toBe('title');
        expect(control<HTMLInputElement>('title').hasAttribute('value')).toBe(false);
    });

    it('answers undefined for a target that is not a control', () => {
        expect(readExoControlValue(document.createElement('button'))).toBe(undefined);
        expect(readExoControlValue(null)).toBe(undefined);
    });
});

describe('a single input, with its listener on itself', () => {
    it('needs no container and no form', () => {
        const schema = createExoSchema((b) => {
            let input!: TExoEventPort;
            b.el('input', { type: 'text' }, (i) => {
                input = i.eventPort('input');
            });
            return { input };
        });
        const states: { value: string }[] = [];
        const Input = composeExoMachine(
            createExoMachine<TExoDomNode, unknown, { value: string }>(schema, {
                createInitialState: () => ({ value: '' }),
            }),
            (m) =>
                withExoHandlers(m, (on) => {
                    on(schema.ports.input, (c, event) => {
                        c.state.value = readExoControlValue(event.target) as string;
                    });
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((c) => {
                        states.push(c.state);
                        return null;
                    });
                })
        );
        const parent = host();
        EXO_BACKEND.render(Input, parent);

        typeInto(parent.querySelector('input') as HTMLInputElement, 'solo');

        expect(states[0].value).toBe('solo');
    });
});

describe('readExoControlValues — the controls behind ref ports, read when asked', () => {
    const FORM = createExoSchema((b) => {
        let name!: TExoRefPort;
        let age!: TExoRefPort;
        let submit!: TExoEventPort;
        b.el('form', null, (f) => {
            submit = f.eventPort('submit');
            f.el('input', { type: 'text' }, (i) => {
                name = i.refPort();
            });
            f.el('input', { type: 'number' }, (i) => {
                age = i.refPort();
            });
        });
        return { name, age, submit };
    });
    const FIELDS = [FORM.ports.name, FORM.ports.age];

    it('reads what is in the controls at the moment it is called', () => {
        const submitted: (TExoControlValue | undefined)[][] = [];
        const Form = withExoHandlers(createExoMachine<TExoDomNode>(FORM), (on) => {
            on(FORM.ports.submit, (c, event) => {
                event.preventDefault();
                submitted.push(readExoControlValues(c, FIELDS));
            });
        });
        const parent = host();
        EXO_BACKEND.render(Form, parent);
        const [name, age] = Array.from(parent.querySelectorAll('input'));
        name.value = 'Ada';
        age.value = '36';

        (parent.querySelector('form') as HTMLFormElement).dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        );

        expect(submitted).toEqual([['Ada', 36]]);
    });

    it('answers undefined for every control on a backend with no document', () => {
        const read: (TExoControlValue | undefined)[][] = [];
        const Form = createExoMachine<TExoStrNode>(FORM, {
            createInitialState: (c) => {
                read.push(readExoControlValues(c, FIELDS));
            },
        });
        new ExoStrBackend().render(Form);
        expect(read).toEqual([[undefined, undefined]]);
    });
});

describe('readExoControlValues over a radio group', () => {
    it('answers the checked member and undefined for the rest', () => {
        const GROUP = createExoSchema((b) => {
            const radios: TExoRefPort[] = [];
            let change!: TExoEventPort;
            b.el('fieldset', null, (f) => {
                change = f.eventPort('change');
                for (const size of ['s', 'm', 'l']) {
                    f.el('input', { type: 'radio', name: 'pick', value: size }, (i) => {
                        radios.push(i.refPort());
                    });
                }
            });
            return { radios, change };
        });
        const read: (TExoControlValue | undefined)[][] = [];
        const Group = withExoHandlers(createExoMachine<TExoDomNode>(GROUP), (on) => {
            on(GROUP.ports.change, (c) => {
                read.push(readExoControlValues(c, GROUP.ports.radios));
            });
        });
        const parent = host();
        EXO_BACKEND.render(Group, parent);

        (parent.querySelectorAll('input')[1] as HTMLInputElement).click();

        expect(read).toEqual([[undefined, 'm', undefined]]);
    });
});

describe('writeExoChoice — the checked or selected mark of a group, keyed by value', () => {
    const SIZES = ['s', 'm', 'l'];
    const GROUP = createExoSchema((b) => {
        const radios: TExoAttrPort[] = [];
        b.el('fieldset', null, (f) => {
            for (const size of SIZES) {
                f.el('input', { type: 'radio', name: 'size', value: size }, (i) => {
                    radios.push(i.port('checked'));
                });
            }
        });
        return { radios };
    });
    const mGroup = createExoMachine<TExoMachineNode, string>(GROUP);
    const SIZE_GROUP = composeExoMachine(mGroup, (m) =>
        withExoWire(m, (c, chosen) => {
            writeExoChoice(c, GROUP.ports.radios, SIZES, chosen);
        })
    );

    const SHELL = createExoSchema((b) => {
        let slot!: TExoChildrenPort;
        b.el('div', null, (d) => {
            slot = d.childrenPort();
        });
        return { slot };
    });

    const mount = (start: string) => {
        const held: TExoNode[] = [];
        const Shell = createExoMachine<TExoDomNode>(SHELL, {
            createInitialState: (c) => {
                const group = wireExoNode(c.createExoNode(SIZE_GROUP), start);
                held.push(group);
                c.appendChild(SHELL.ports.slot, group);
            },
        });
        const parent = host();
        EXO_BACKEND.render(Shell, parent);
        const radios = Array.from(parent.querySelectorAll('input')) as HTMLInputElement[];
        return { group: held[0], radios };
    };

    it('serves the starting mark from the server', () => {
        const Group = createExoMachine<TExoStrNode>(GROUP, {
            createInitialState: (c) => {
                writeExoChoice(c, GROUP.ports.radios, SIZES, 'm');
            },
        });
        expect(new ExoStrBackend().render(Group)).toBe(
            '<fieldset><input type="radio" name="size" value="s">' +
                '<input type="radio" name="size" value="m" checked="">' +
                '<input type="radio" name="size" value="l"></fieldset>'
        );
    });

    it('moves the mark when the parent re-wires the group with a new value', () => {
        const { group, radios } = mount('s');
        expect(radios.map((r) => r.checked)).toEqual([true, false, false]);

        wireExoNode(group, 'l');
        expect(radios.map((r) => r.checked)).toEqual([false, false, true]);
    });

    it('needs no memory of the old mark, so a choice the user made natively is overridden', () => {
        const { group, radios } = mount('s');
        radios[1].click();

        wireExoNode(group, 's');
        expect(radios.map((r) => r.checked)).toEqual([true, false, false]);
    });

    it('clears every member for a value that is not in the group', () => {
        const { group, radios } = mount('m');

        wireExoNode(group, 'none');
        expect(radios.map((r) => r.checked)).toEqual([false, false, false]);
    });
});
