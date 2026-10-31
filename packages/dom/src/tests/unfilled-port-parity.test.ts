// @vitest-environment jsdom
//
// WHAT EACH BACKEND PRINTS FOR A PORT THE WIRE NEVER FILLS — one component per port kind,
// rendered through both, bytes compared.
//
// LEAVING A PORT UNFILLED IS LEGAL AND IS MEANT TO STAY LEGAL. `TExoStrNode.reset` says so
// in as many words, and names the case: a row that renders no subtitle. So this file is not
// about refusing the shape — it is about the two backends printing the SAME nothing for it.
//
// THE DEFECT THIS FILE WAS WRITTEN FOR. The server clears every slot to `''` before the wire
// runs, so an unfilled port prints nothing. The DOM backend used to emit a placeholder CHARACTER
// into a text port's element so that the parser would make a Text node of it — and that character
// was left standing in every clone, so an unfilled text port printed a stray space. The same
// component served `<p class="sub"></p>` and built `<p class="sub"> </p>`: nothing threw, nothing
// was red, and hydration adopted markup a client render would never have produced.
//
// IT IS CLOSED AT THE SOURCE NOW. The compiler builds its prototype instead of parsing one, so it
// appends an EMPTY Text node where a text port stands — there is no character to empty out, and
// the node, which is all the placeholder was ever for, still takes a `.data` store.
//
// AN ATTRIBUTE PORT WAS THE LAST KIND TO AGREE, and it is at the bottom of this file. Its
// placeholder was ` name=""` written into the prototype, and it was there so that two ports on one
// element came out in DECLARATION order rather than in whatever order the wire happened to fill
// them. What the leftover cost was a BEHAVIOUR rather than a byte: in HTML the presence of
// `disabled`, `hidden`, `checked`, `readonly`, `required` or `selected` IS its value, so a
// component with a conditional `disabled` SERVED an enabled button and BUILT a disabled one.
//
// WHAT CLOSES IT NOW IS ONE RULE, AND IT HAS NO PER-INSTANCE HALF. No attribute port puts anything
// on the prototype at all — not even for the length of a compile. The spelling a parser would have
// made of the name is COMPUTED by the compiler and handed to the writer (`exoAttrIdentity`), so
// there is nothing to read back off the element and nothing to take off again. An unfilled port
// leaves the element as bare as the server prints it, per instance and per clone alike.
//
// WHAT THAT GIVES UP, stated where it is given up rather than found later: with no position
// reserved, two attribute ports on one element come out in FILL order on this backend while the
// server prints them in DECLARATION order. Same tree, different bytes. The last describe in this
// file is that difference, asserted.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoEventPort,
    TExoPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { exoDomSchemaOf } from '../dom/exoDomSchemaOf';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

/** The only exonode call the wires below make. A method, so real exonodes satisfy it. */
type TFilling = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** The same, for the one wire here that builds a LIST of rows rather than filling one. */
type TListing = {
    list(port: TExoPort, component: TExoMachine<never>, count: number): void;
};

/** Render one instance through the DOM backend and hand back the markup it produced. */
const fromDom = (component: TExoMachine<TExoDomNode>): string => {
    const parent = host();
    EXO_BACKEND.render(component, parent);
    return parent.innerHTML;
};

/**
 * `n` ROWS OF ONE COMPONENT, AS A LIST — the shape the two cases below need, and the only one
 * that gives them what they are about.
 *
 * THEY ARE ABOUT WHAT ROW TWO INHERITS FROM ROW ONE: one prototype, one schema and one sweep-flag
 * array, reused down a run of siblings. `c.list` mounts every row through exactly that shared machinery
 * and hands row `i` the number `i` as its INDEX, which is what those wires branch on. Separate
 * top-level renders would give each row its own pass and could not ask the question.
 *
 * The `<div>` is the element the children port lives on and it is the same wrapper on both
 * backends, so the byte comparisons still compare like with like.
 */
const listOf = (component: TExoMachine<TExoDomNode>, n: number) => {
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let rows!: TExoChildrenPort;
            b.el('div', null, (d) => {
                rows = d.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TListing> =>
            (c) => {
                c.list(P.rows, component, n);
            }
    );
};

const TEXT_NODE = 3;

describe('a TEXT port the wire never fills', () => {
    /**
     * The shape `TExoStrNode.reset` names: a row with a subtitle it does not always have.
     * The wire fills nothing at all, which is the whole point — a wire that fills conditionally
     * takes this branch on the rows where the condition is false.
     */
    const SUBTITLE = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let sub!: TExoTextPort;
            b.el('p', { class: 'sub' }, (p) => {
                sub = p.textPort();
            });
            return { sub };
        },
        (): TExoMachineInitialState<TFilling> => () => undefined
    );

    it('prints the same bytes on both backends, and they are an empty element', () => {
        // WITHOUT THE FIX the DOM backend returns `<p class="sub"> </p>` here and the server
        // returns `<p class="sub"></p>`. Both assertions are written out rather than compared
        // to each other, so that a change which makes the two agree on the WRONG bytes — a
        // space on both — has to edit the expectation and read the comment at the top.
        expect(EXO_STR.render(SUBTITLE)).toBe('<p class="sub"></p>');
        expect(fromDom(SUBTITLE)).toBe('<p class="sub"></p>');
    });

    it('still leaves a Text node in the prototype, which is what the placeholder is for', () => {
        // THE OTHER HALF OF THE FIX, and the half a careless repair would throw away. Emitting
        // no placeholder at all would also make the two backends agree — and would cost every
        // filled text port a `textContent` assignment instead of a `.data` store, measured at
        // twice the cost. So the node must still be there, and it must be EMPTY.
        const first = exoDomSchemaOf(SUBTITLE, EXO_BACKEND).proto.firstChild as Text | null;
        expect(first).not.toBeNull();
        expect(first?.nodeType).toBe(TEXT_NODE);
        expect(first?.data).toBe('');
    });
});

describe('a TEXT port the wire DOES fill', () => {
    const labelled = (value: unknown) =>
        createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let t!: TExoTextPort;
                b.el('p', null, (p) => {
                    t = p.textPort();
                });
                return { t };
            },
            (P): TExoMachineInitialState<TFilling> =>
                (c) => {
                    c.text(P.t, value);
                }
        );

    it('prints the value on both backends — the fill path is untouched', () => {
        const component = labelled('hello');
        expect(EXO_STR.render(component)).toBe('<p>hello</p>');
        expect(fromDom(component)).toBe('<p>hello</p>');
    });

    it('escapes it identically on both backends', () => {
        const component = labelled('a < b & c');
        const markup = EXO_STR.render(component);
        expect(markup).toBe('<p>a &lt; b &amp; c</p>');
        expect(fromDom(component)).toBe(markup);
    });

    it('prints nothing on both when the value IS the empty string', () => {
        // The case the server could never tell apart from "unfilled" if the fix had been made
        // by teaching the server to print a space. It is filled, with `''`, and it must print
        // an empty element — the same bytes an unfilled port now prints, which is correct: an
        // empty subtitle and no subtitle look the same in HTML.
        const component = labelled('');
        expect(EXO_STR.render(component)).toBe('<p></p>');
        expect(fromDom(component)).toBe('<p></p>');
    });

    it('prints nothing on both when the value is null', () => {
        const component = labelled(null);
        expect(EXO_STR.render(component)).toBe('<p></p>');
        expect(fromDom(component)).toBe('<p></p>');
    });
});

describe('a CHILDREN port the wire never fills', () => {
    it('prints nothing on both backends — it always did, and this says so', () => {
        // NOT A DEFECT, pinned so that it stays that way. A children port emits no markup on
        // either backend: the server's slot stays `''` and the DOM compiler writes nothing
        // where the child list stands, leaving the two statics adjacent on both sides.
        const CARD = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let kids!: TExoChildrenPort;
                b.el('div', { class: 'card' }, (card) => {
                    card.el('h3', null, (h) => h.text('title'));
                    kids = card.childrenPort();
                    card.el('footer');
                });
                return { kids };
            },
            (): TExoMachineInitialState<TFilling> => () => undefined
        );

        const expected = '<div class="card"><h3>title</h3><footer></footer></div>';
        expect(EXO_STR.render(CARD)).toBe(expected);
        expect(fromDom(CARD)).toBe(expected);
    });
});

describe('an EVENT port the wire never fills', () => {
    it('prints nothing on both backends — a listener has no markup form on either', () => {
        // NOT A DEFECT either, and for a reason worth pinning: an event port takes a SLOT on
        // both backends and emits no characters on either, filled or not. The server's writer
        // is `writeNothing`; the DOM compiler `continue`s before it writes anything.
        const BUTTON = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let click!: TExoEventPort;
                b.el('button', null, (btn) => {
                    click = btn.eventPort('click');
                    btn.text('go');
                });
                return { click };
            },
            (): TExoMachineInitialState<TFilling> => () => undefined
        );

        expect(EXO_STR.render(BUTTON)).toBe('<button>go</button>');
        expect(fromDom(BUTTON)).toBe('<button>go</button>');
    });
});

describe('an ATTRIBUTE port the wire never fills', () => {
    /**
     * A conditional attribute, written the way an author writes one: filled on some rows and
     * simply not mentioned on the others. `disabled` rather than `data-x` because it is the
     * value that makes the divergence a behaviour and not a byte — a present `disabled`, with
     * ANY value including the empty one, is a disabled control.
     */
    const BUTTON = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let disabled!: TExoAttrPort;
            b.el('button', null, (btn) => {
                disabled = btn.port('disabled');
                btn.text('go');
            });
            return { disabled };
        },
        (): TExoMachineInitialState<TFilling> => () => undefined
    );

    it('is left out entirely by the SERVER', () => {
        // Each backend's ACTUAL output, pinned separately from the agreement below, so that a
        // change which makes them agree has to say WHICH way it made them agree.
        expect(EXO_STR.render(BUTTON)).toBe('<button>go</button>');
    });

    it('is left out entirely by the DOM backend too — no attribute, not an empty one', () => {
        // THE TREE, SPELLED OUT, because "the two agree" would also be true of the wrong answer.
        // What must be there is a button with NO `disabled` attribute: an attribute present with
        // an empty value is a DISABLED button, so `<button disabled="">` is not a cosmetic
        // difference from this, it is a different control.
        expect(fromDom(BUTTON)).toBe('<button>go</button>');

        const parent = host();
        EXO_BACKEND.render(BUTTON, parent);
        const button = parent.firstElementChild as HTMLButtonElement;
        expect(button.hasAttribute('disabled')).toBe(false);
        expect(button.disabled).toBe(false);
    });

    it('prints the same bytes on both backends — an enabled button on both', () => {
        // WHAT THIS FILE EXISTS FOR, on the kind that was the last to agree. It used to serve an
        // enabled button and build a disabled one.
        expect(fromDom(BUTTON)).toBe(EXO_STR.render(BUTTON));
    });

    it('has no placeholder left in the PROTOTYPE, and no per-instance work either', () => {
        // THE MECHANISM. Nothing is ever written for an attribute port — for this one or for any
        // other — so the unfilled case costs nothing at all to get right: there is no fill record to
        // keep and nothing to remove after the wire returns.
        const proto = exoDomSchemaOf(BUTTON, EXO_BACKEND).proto;
        expect(proto.hasAttribute('disabled')).toBe(false);
        expect(proto.getAttributeNames()).toEqual([]);
    });
});

describe('a BOOLEAN attribute port, filled on one row and skipped on the next', () => {
    /**
     * The shape the defect was actually reported as: ONE component, whose wire fills the port for
     * some rows and simply does not mention it for the others. Both rows come out of the same
     * prototype, so a leftover placeholder is a disabled button standing next to an enabled one
     * that the server would have rendered the other way round.
     */
    const ROW = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let disabled!: TExoAttrPort;
            b.el('button', null, (btn) => {
                disabled = btn.port('disabled');
                btn.text('go');
            });
            return { disabled };
        },
        (P): TExoMachineInitialState<TFilling> =>
            (c, index) => {
                if (index === 0) c.attr(P.disabled, true);
            }
    );

    const TWO_ROWS = listOf(ROW, 2);

    it('disables the first and leaves the second alone, identically on both backends', () => {
        const expected = '<div><button disabled="">go</button><button>go</button></div>';
        expect(EXO_STR.render(TWO_ROWS)).toBe(expected);

        const parent = host();
        EXO_BACKEND.render(TWO_ROWS, parent);
        expect(parent.innerHTML).toBe(expected);
    });

    it('builds the two CONTROLS the served markup describes', () => {
        // The bytes above are only the evidence; this is the claim. `disabled` is not read from
        // the attribute's value but from its presence, so this is the assertion a user would have
        // made — one dead button and one that works.
        const parent = host();
        EXO_BACKEND.render(TWO_ROWS, parent);
        const buttons = parent.querySelectorAll('button');
        expect(buttons[0].disabled).toBe(true);
        expect(buttons[1].disabled).toBe(false);
    });
});

describe('a PROPERTY port the wire never fills', () => {
    /**
     * `checked` is the port the sweep used to exist for, and the one that says why removing the
     * placeholder is safe rather than merely cheaper. Its fill assigns the `checked` PROPERTY —
     * that is the write the browser draws from — so an empty ` checked=""` standing in the
     * prototype is not bytes a fill put there, and a present `checked`, empty or not, is a TICKED
     * box. The placeholder had to be swept per instance because only the instance knew whether its
     * wire mentioned the port.
     *
     * WITH THE PLACEHOLDER GONE THE QUESTION GOES WITH IT: an unfilled property port leaves no
     * attribute, which is exactly what the server prints, so the control's RESET value agrees too
     * (`defaultChecked` IS the `checked` attribute). The setter still brings the attribute into
     * step behind the property for a FILLED port, which is what keeps `checked={true}` reset-safe.
     */
    const BOX = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let checked!: TExoAttrPort;
            b.el('input', { type: 'checkbox' }, (input) => {
                checked = input.port('checked');
            });
            return { checked };
        },
        (): TExoMachineInitialState<TFilling> => () => undefined
    );

    it('serves and builds the SAME UNTICKED BOX', () => {
        const expected = '<input type="checkbox">';
        expect(EXO_STR.render(BOX)).toBe(expected);
        expect(fromDom(BOX)).toBe(expected);

        const parent = host();
        EXO_BACKEND.render(BOX, parent);
        expect((parent.firstElementChild as HTMLInputElement).checked).toBe(false);
    });

    it('keeps NO placeholder in the PROTOTYPE, so there is nothing to take out per instance', () => {
        // THE ASSERTION THAT FLIPPED. It read `hasAttribute('checked') === true` plus a non-null
        // `TExoDomSchema.restore` holding one entry — the position reserved for a property port, and
        // the way back out of it. Both are gone: an `<input>` prototype now carries only what the
        // schema declared static, so an unfilled `checked` port is an unticked box with no
        // attribute, in the markup and in the control alike.
        const schema = exoDomSchemaOf(BOX, EXO_BACKEND);
        expect(schema.proto.hasAttribute('checked')).toBe(false);
        expect(schema.proto.getAttributeNames()).toEqual(['type']);
    });
});

describe('TWO attribute ports on one element', () => {
    /**
     * ═══ THIS IS THE GUARANTEE THAT WAS GIVEN UP, AND THESE CASES ARE WHAT IT LOOKS LIKE ═══
     *
     * The placeholder existed to hold a port's POSITION: `setAttribute` APPENDS, so two ports
     * filled in reverse come out in FILL order while the server prints them in DECLARATION order.
     * With the placeholders removed that is what happens — the same tree with the same attributes
     * and the same values, serialised in a different order on the two backends.
     *
     * WHY THAT IS TOLERABLE AND THE LEFTOVER WAS NOT: attribute order is not read by anything. A
     * leftover ` disabled=""` is a dead control; `class` printed after `disabled` is the same
     * button. Hydration compares attributes BY NAME (`repairExoAttribute` calls `getAttribute`),
     * so nothing at run time compares serialised markup either.
     *
     * The wire below fills `disabled` FIRST and `class` SECOND, the reverse of how they are
     * declared, which is what makes the disagreement visible.
     */
    const BOTH = createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let cls!: TExoAttrPort;
            let disabled!: TExoAttrPort;
            b.el('button', null, (btn) => {
                cls = btn.port('class');
                disabled = btn.port('disabled');
                btn.text('go');
            });
            return { cls, disabled };
        },
        (P): TExoMachineInitialState<TFilling> =>
            (c) => {
                c.attr(P.disabled, true);
                c.attr(P.cls, 'primary');
            }
    );

    it('come out in FILL order here and DECLARATION order on the server', () => {
        // BOTH SIDES SPELLED OUT, NOT COMPARED: this case asserted one string for both backends
        // while `class` held a reserved position. Two different strings is what it is now, and
        // writing them out is what makes a future change to either side visible.
        expect(EXO_STR.render(BOTH)).toBe('<button class="primary" disabled="">go</button>');
        expect(fromDom(BOTH)).toBe('<button disabled="" class="primary">go</button>');
    });

    it('builds the SAME BUTTON either way, which is what order does not change', () => {
        // THE CLAIM UNDER THE BYTES. Attribute order is not read by anything: the control a
        // browser ends up with is the same one whichever end of the list each attribute sits at,
        // and hydration asks for an attribute BY NAME.
        const served = document.createElement('template');
        served.innerHTML = EXO_STR.render(BOTH);
        const fromServer = served.content.firstElementChild as HTMLButtonElement;

        const parent = host();
        EXO_BACKEND.render(BOTH, parent);
        const fromClient = parent.firstElementChild as HTMLButtonElement;

        expect(fromClient.disabled).toBe(fromServer.disabled);
        expect(fromClient.getAttribute('class')).toBe(fromServer.getAttribute('class'));
        expect([...fromClient.getAttributeNames()].sort()).toEqual(
            [...fromServer.getAttributeNames()].sort()
        );
    });

    it('holds a placeholder for NEITHER port', () => {
        // WHICH ONE USED TO NEED IT: `class`, because another attribute port stood behind it.
        // Nothing reserves a position now, so the prototype is bare on both counts.
        const proto = exoDomSchemaOf(BOTH, EXO_BACKEND).proto;
        expect(proto.getAttributeNames()).toEqual([]);
    });

    it('leaves NOTHING behind for the port the wire skips, on either backend', () => {
        // THE CASE THAT NOW PASSES FOR A BETTER REASON. `class` used to be held for the order and
        // taken back out by the per-instance sweep; there is no placeholder to leave behind at
        // all, so the two backends print one string with no per-instance work on either side.
        const SECOND_ONLY = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let cls!: TExoAttrPort;
                let disabled!: TExoAttrPort;
                b.el('button', null, (btn) => {
                    cls = btn.port('class');
                    disabled = btn.port('disabled');
                    btn.text('go');
                });
                return { cls, disabled };
            },
            (P): TExoMachineInitialState<TFilling> =>
                (c) => {
                    c.attr(P.disabled, true);
                }
        );

        const expected = '<button disabled="">go</button>';
        expect(EXO_STR.render(SECOND_ONLY)).toBe(expected);
        expect(fromDom(SECOND_ONLY)).toBe(expected);
    });

    it('lets no row inherit an attribute from the row in front of it', () => {
        // THE CASE THAT USED TO NEED THE SWEEP'S FLAGS RESET, and the one that keeps meaning
        // something without it. Two rows share one prototype and one schema; the first fills `class`
        // and the second does not. The second row must not carry the first's `class` — which it
        // cannot, because every row is a fresh clone of a prototype that holds no placeholder.
        // The wire fills in declaration order here, so fill order and the server's order agree.
        const EVERY_OTHER = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let cls!: TExoAttrPort;
                let disabled!: TExoAttrPort;
                b.el('button', null, (btn) => {
                    cls = btn.port('class');
                    disabled = btn.port('disabled');
                    btn.text('go');
                });
                return { cls, disabled };
            },
            (P): TExoMachineInitialState<TFilling> =>
                (c, index) => {
                    if (index === 0) c.attr(P.cls, 'first');
                    c.attr(P.disabled, true);
                }
        );

        const TWO_ROWS = listOf(EVERY_OTHER, 2);
        const expected =
            '<div><button class="first" disabled="">go</button>' +
            '<button disabled="">go</button></div>';
        expect(EXO_STR.render(TWO_ROWS)).toBe(expected);

        const parent = host();
        EXO_BACKEND.render(TWO_ROWS, parent);
        expect(parent.innerHTML).toBe(expected);
    });
});
