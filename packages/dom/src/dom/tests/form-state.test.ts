// @vitest-environment jsdom
//
// FORM CONTROLS, WHERE THE ATTRIBUTE AND THE PROPERTY ARE TWO DIFFERENT THINGS.
//
// `value`, `checked` and `selected` name the control's INITIAL state as attributes and its LIVE
// state as properties. They agree exactly until the user touches the control, and from that
// moment `setAttribute('value', …)` moves nothing on screen. That is the bug behind "clearing
// the form silently did nothing", and it is the reason `EXO_DOM_PROPERTIES` exists, the reason
// `exo-attr-setter` has a first branch, and the reason `exo-writer-for-port` has a third writer.
//
// WHAT WAS AND WAS NOT PINNED. `attr-parity.test.ts` asserts that the DOM backend writes the
// PROPERTY and that the two backends' bytes therefore differ on purpose. What it does not do is
// touch the control first — and everything that makes this hard only starts once a user has.
// The legacy renderer had a whole file for that (`src/form-state.test.ts`, seven cases); this
// core had none, so a change that quietly went back to `setAttribute` would have left every
// parity assertion green and every form in the product dead.
//
// THE `<select>` CASE IS THE ONE WITH THE ORDERING TRAP. `select.value = 'b'` selects nothing at
// all unless the options already exist. On this core they always do — the options are STATIC
// markup, so they are in the parsed prototype before any port is filled — which is a property of
// the design worth holding onto rather than a coincidence to rediscover.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoMachineNode,
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

/** Both calls these wires make, as methods, so real exonodes satisfy the type. */
type TFilling = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    onTeardown(off: () => void): void;
};

/**
 * A `<select>` with two static options, each carrying its own `selected` port.
 *
 * THE PORT USED TO STAND ON THE `<select>` AND BE CALLED `value`, AND THAT SHAPE IS REFUSED NOW
 * (`@exodra/core`'s `check-misplaced-property-port`). It drove the control perfectly in the
 * browser and could not be SERVED at all: a `<select>` has no `value` content attribute, so the
 * server printed nothing and every server-rendered page showed the FIRST option whatever the data
 * said. The markup that says which option is chosen is ` selected` on the OPTION — a different
 * element, past the port's own slot — so the fix is to declare the port where the markup is.
 *
 * WHICH MAKES THE ORDERING TRAP BELOW STRUCTURAL RATHER THAN MANAGED, and that is the reason
 * these cases are kept rather than deleted with the old shape: a port on the option cannot be
 * filled before that option exists, because it is a position INSIDE it.
 */
const buildSelect = (b: TExoSchemaCursor) => {
    let a!: TExoAttrPort;
    let v!: TExoAttrPort;
    b.el('select', null, (s) => {
        s.el('option', { value: 'a' }, (o) => {
            a = o.port('selected');
            o.text('A');
        });
        s.el('option', { value: 'b' }, (o) => {
            v = o.port('selected');
            o.text('B');
        });
    });
    return { a, v };
};

describe('a <select> whose options are static markup', () => {
    it('selects the option it is FILLED with, because the options already exist', () => {
        // The legacy renderer had to defer `select.value = …` until after the children were
        // built. Nothing writes `select.value` any more — each option says whether it is the
        // chosen one — so the write lands on the element it is about by construction, and this
        // case is what says so: the SECOND option is chosen, from a prototype whose placeholder
        // markup carries ` selected=""` on BOTH.
        const SELECT = createExoTestMachine(
            buildSelect,
            (P): TExoMachineInitialState<TFilling> =>
                (c) => {
                    c.attr(P.a, false);
                    c.attr(P.v, true);
                }
        );

        const parent = host();
        EXO_BACKEND.render(SELECT, parent);
        const select = parent.querySelector('select') as HTMLSelectElement;

        expect(select.value).toBe('b');
        expect(select.selectedIndex).toBe(1);
    });

    it('follows a bound value after the user has already chosen something else', () => {
        // The two-way case, from the side this renderer owns. What the user did is in the
        // PROPERTY — an option's selectedness — so an update that went only to the attribute
        // would leave the user's choice on screen and the model's choice nowhere. Each option is
        // bound to `model === its own value`, the same shape a radio group has had all along.
        const src = source<unknown>('a');
        const schema = createExoSchema(buildSelect);
        const m = createExoMachine<TExoMachineNode>(schema);
        const SELECT = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    choose: (c) => {
                        c.attr(schema.ports.a, src.getValue() === 'a');
                        c.attr(schema.ports.v, src.getValue() === 'b');
                    },
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((c) => {
                        choose(c);
                        return src.onChange(() => choose(c));
                    });
                })
        );
        const { choose } = SELECT.transitions;

        const parent = host();
        EXO_BACKEND.render(SELECT, parent);
        const select = parent.querySelector('select') as HTMLSelectElement;
        expect(select.value).toBe('a');

        // The user picks the other option.
        select.value = 'b';
        expect(select.selectedIndex).toBe(1);

        // The model says otherwise, and the model wins — on both options, in whichever order
        // they are notified.
        src.setValue('a');
        expect(select.value).toBe('a');
        expect(select.selectedIndex).toBe(0);
    });

    it('serves the SAME option the client render chooses, which the old shape could not', () => {
        // THE DEFECT THE REFUSAL CLOSED, asserted where the two backends meet. With the port on
        // the `<select>` this comparison was impossible to satisfy: the server had no attribute
        // to print, so the served page was on the first option and the client render on the
        // second. Same wire, both backends, one option.
        const SELECT = createExoTestMachine(
            buildSelect,
            (P): TExoMachineInitialState<TFilling> =>
                (c) => {
                    c.attr(P.a, false);
                    c.attr(P.v, true);
                }
        );

        const holder = document.createElement('template');
        holder.innerHTML = EXO_STR.render(SELECT);
        const parent = host();
        EXO_BACKEND.render(SELECT, parent);

        expect((holder.content.firstElementChild as HTMLSelectElement).value).toBe('b');
        expect((parent.firstElementChild as HTMLSelectElement).value).toBe('b');
        expect(EXO_STR.render(SELECT)).toBe(parent.innerHTML);
    });
});

describe('a checkbox the user has already ticked', () => {
    it('unticks when the model says so', () => {
        // `checked` after a click lives ONLY in the property: from the first click the attribute
        // is no longer what the browser draws from, whatever it says. A renderer that wrote the
        // attribute INSTEAD of the property would produce a box that ignores the model from that
        // click onwards, which is the shape of every "the filter checkbox will not clear" report.
        // (The setter does write the attribute as well, AFTER the property, so that the box's
        // reset value follows the model too — see `exo-attr-setter`. That write is invisible
        // here by construction: the property assignment has already set the dirty flag, which is
        // what this case would catch if the order were ever reversed.)
        const src = source<unknown>(true);
        const schema = createExoSchema((b: TExoSchemaCursor) => {
            let v!: TExoAttrPort;
            b.el('input', { type: 'checkbox' }, (i) => {
                v = i.port('checked');
            });
            return { v };
        });
        const m = createExoMachine<TExoMachineNode>(schema);
        const BOX = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    show: (c) => {
                        c.attr(schema.ports.v, src.getValue());
                    },
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((c) => {
                        show(c);
                        return src.onChange(() => show(c));
                    });
                })
        );
        const { show } = BOX.transitions;

        const parent = host();
        EXO_BACKEND.render(BOX, parent);
        const box = parent.querySelector('input') as HTMLInputElement;
        expect(box.checked).toBe(true);

        // The user unticks it, then ticks it again — the property moves, the attribute does not.
        box.click();
        expect(box.checked).toBe(false);
        box.click();
        expect(box.checked).toBe(true);

        src.setValue(false);
        expect(box.checked).toBe(false);
    });
});

describe('a text field the user has already typed in', () => {
    it('follows the model, and clears when the model clears — the form-reset case', () => {
        const src = source<unknown>('Anna');
        const schema = createExoSchema((b: TExoSchemaCursor) => {
            let v!: TExoAttrPort;
            b.el('input', null, (i) => {
                v = i.port('value');
            });
            return { v };
        });
        const m = createExoMachine<TExoMachineNode>(schema);
        const FIELD = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    show: (c) => {
                        c.attr(schema.ports.v, src.getValue());
                    },
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((c) => {
                        show(c);
                        return src.onChange(() => show(c));
                    });
                })
        );
        const { show } = FIELD.transitions;

        const parent = host();
        EXO_BACKEND.render(FIELD, parent);
        const field = parent.querySelector('input') as HTMLInputElement;
        expect(field.value).toBe('Anna');

        // The user types over it.
        field.value = 'Andrei';

        // Setting the model to the EMPTY STRING is the case that used to do nothing visible:
        // the attribute was already empty, so writing it changed nothing, and the field kept
        // showing what the user typed.
        src.setValue('');
        expect(field.value).toBe('');

        src.setValue('Anna');
        expect(field.value).toBe('Anna');
    });
});

describe('`value` on an element that has no such property', () => {
    it('is written as an ordinary ATTRIBUTE — the element decides what the name means', () => {
        // `exo-attr-setter` asks `exoDomPropertyKind(tag, name)` and then the prototype itself, so
        // the same port name is a property on an `<input>` and an attribute on a `<div>`. Only
        // the PAIR can answer, which is why the setter is built against the parsed prototype
        // rather than from the name alone — and why the string backend is now handed the tag.
        const DIV = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let v!: TExoAttrPort;
                b.el('div', null, (d) => {
                    v = d.port('value');
                });
                return { v };
            },
            (P): TExoMachineInitialState<TFilling> =>
                (c) => {
                    c.attr(P.v, 'x');
                }
        );

        const parent = host();
        EXO_BACKEND.render(DIV, parent);
        expect(parent.innerHTML).toBe('<div value="x"></div>');
        expect(EXO_STR.render(DIV)).toBe('<div value="x"></div>');
    });

    it('AGREES with the server for a null value, now that the server knows the tag', () => {
        // THIS CASE USED TO PIN THE OPPOSITE, and the change is the point. The DOM backend
        // reached the ordinary attribute setter (there is no `value` property on a `<div>`) and
        // applied the REMOVAL rule; the server had no element to ask, went by the NAME alone,
        // took the property writer — which has no removal rule — and printed ` value=""`. The
        // comment here said closing it meant teaching the string backend which tags carry which
        // properties, "a table nobody has needed yet". That table is `exoDomPropertyKind` in
        // `@exodra/core`, both compilers read it, and this is what it bought.
        const DIV = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let v!: TExoAttrPort;
                b.el('div', null, (d) => {
                    v = d.port('value');
                });
                return { v };
            },
            (P): TExoMachineInitialState<TFilling> =>
                (c) => {
                    c.attr(P.v, null);
                }
        );

        const parent = host();
        EXO_BACKEND.render(DIV, parent);
        expect(parent.innerHTML).toBe('<div></div>');
        expect(EXO_STR.render(DIV)).toBe('<div></div>');
    });
});
