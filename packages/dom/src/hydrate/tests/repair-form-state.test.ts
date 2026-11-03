// @vitest-environment jsdom
//
// A FORM WHOSE DATA MOVED BETWEEN THE RESPONSE AND THE HYDRATION.
//
// Hydration repairs a TEXT port and an ordinary ATTRIBUTE: the
// server printed what the source held when the request was served, the client may compute
// something else by the time the bundle lands, and skipping the first write would leave the page
// wrong until the source next fired — which for a value that never changes again is forever.
//
// A FORM CONTROL WAS EXEMPT FROM ALL OF IT, and the exemption was invisible because of how it was
// written. `repair-attribute` returned early for `null`, `undefined`, `true` and `false` — the
// four values the two backends used to print differently on purpose — and a `checked` or
// `selected` port's value is a BOOLEAN AND NOTHING ELSE, so the repair never fired on a checkbox
// or a radio in its life. A checkbox served ticked stayed ticked; a radio group served with the
// wrong option selected kept it. The exemption is gone (the divergence it named was closed the
// day the ordinary attribute writer learned to remove — see `attr-parity.test.ts`), and these are
// the cases that would have caught it.
//
// THE OTHER HALF OF THE SAME BUG WAS IN THE BYTES and is pinned in `property-parity.test.ts`:
// the server printed `checked="false"`, which is a TICKED box, so the page was wrong before
// hydration had anything to repair. Both halves matter — the first is what a reader of the
// served page sees, the second is what survives the hydration.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoMachineNode,
    TExoPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

type TSource = { getValue(): unknown; onChange(cb: (...event: never[]) => void): () => void };

/**
 * What the radio GROUP's wire needs: a fixed list of instances in a children port.
 *
 * `TExoMachine<never, T>` is the top type for a component — a wire taking any exonode is
 * assignable to one taking `never` — which is how `adopt-list.test.ts` spells the same thing for
 * `bindList`.
 */
type TFixedList = {
    list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
};

/** One control, one bound property port — the whole component, so nothing else can explain it. */
const controlBoundTo = (
    tag: string,
    attrs: Record<string, string> | null,
    name: string,
    src: TSource
) => {
    const schema = createExoSchema((b: TExoSchemaCursor) => {
        let p!: TExoAttrPort;
        b.el(tag, attrs, (e) => {
            p = e.port(name);
        });
        return { x: p };
    });
    const m = createExoMachine<TExoMachineNode>(schema);
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                show: (c) => {
                    c.attr(schema.ports.x, src.getValue());
                },
            }),
        (m) => {
            const { show } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return src.onChange(() => show(c));
                });
            });
        }
    );
    return machine;
};

describe('hydrating a control whose source moved since the response', () => {
    it('repairs a TEXT INPUT — the case that already worked', () => {
        // The control this project could always repair, here as the CONTRAST rather than as the
        // claim: `value` holds a string, so it never met the boolean exemption below. If this
        // one ever breaks, the repair is broken generally and the checkbox cases are not the
        // place to find that out.
        const text = source<unknown>('from the server');
        const INPUT = controlBoundTo('input', null, 'value', text);
        const parent = host();
        parent.innerHTML = EXO_STR.render(INPUT);
        expect(parent.innerHTML).toBe('<input value="from the server">');

        // What the client computes now — nobody is subscribed yet, so this changes no DOM.
        text.setValue('the client disagrees');
        EXO_BACKEND.hydrate(INPUT, parent);

        expect((parent.firstElementChild as HTMLInputElement).value).toBe('the client disagrees');
        // The repair is a WRITE, not a rebind: the subscription still works afterwards.
        text.setValue('and again');
        expect((parent.firstElementChild as HTMLInputElement).value).toBe('and again');
    });

    it('repairs a CHECKBOX the server served ticked', () => {
        // THE BUG. The value is `false` and the server's markup says the box is ticked, so a
        // repair that declines to judge booleans leaves a ticked box on a page whose data says
        // it is empty — and leaves it there for as long as the source does not fire.
        const ticked = source<unknown>(true);
        const BOX = controlBoundTo('input', { type: 'checkbox' }, 'checked', ticked);
        const parent = host();
        parent.innerHTML = EXO_STR.render(BOX);
        expect(parent.innerHTML).toBe('<input type="checkbox" checked="">');
        expect((parent.firstElementChild as HTMLInputElement).checked).toBe(true);

        ticked.setValue(false);
        EXO_BACKEND.hydrate(BOX, parent);

        expect((parent.firstElementChild as HTMLInputElement).checked).toBe(false);
        ticked.setValue(true);
        expect((parent.firstElementChild as HTMLInputElement).checked).toBe(true);
    });

    it('repairs a CHECKBOX the server served unticked', () => {
        // The other direction, which is not symmetrical in the markup: "unticked" is the ABSENCE
        // of the attribute, so the comparison has to be against absence and not against an empty
        // string. An implementation that compared `getAttribute(name) === ''` would pass the
        // case above and silently do nothing here.
        const box = source<unknown>(false);
        const BOX = controlBoundTo('input', { type: 'checkbox' }, 'checked', box);
        const parent = host();
        parent.innerHTML = EXO_STR.render(BOX);
        expect(parent.innerHTML).toBe('<input type="checkbox">');

        box.setValue(true);
        EXO_BACKEND.hydrate(BOX, parent);

        expect((parent.firstElementChild as HTMLInputElement).checked).toBe(true);
    });

    it('moves the selection in a RADIO GROUP, and serves exactly one selected', () => {
        // THE SHAPE THAT MADE THIS URGENT. Every unselected radio in a group carries
        // `checked={false}`, so the writer's missing removal rule served a group in which EVERY
        // option was selected — the browser keeps the last one, which is not the one the data
        // named — and the repair's boolean exemption then left it there.
        //
        // Asserted on the served markup FIRST, because that is a page a user can see before any
        // JavaScript has run, and then across the hydration.
        //
        // THE THREE OPTIONS ARE A LIST, which is what a radio group is in an application: one
        // component per option, placed by a children port. They used to be three ROOTS mounted side
        // by side by an entry point that took a count — a shape no library offers and no page has,
        // and one that could not carry the group's `<form>` around them either.
        const chosen = source(1);
        const optionSchema = createExoSchema((b: TExoSchemaCursor) => {
            let p!: TExoAttrPort;
            b.el('input', { type: 'radio', name: 'pick' }, (e) => {
                p = e.port('checked');
            });
            return { x: p };
        });
        const mOption = createExoMachine<TExoMachineNode, number, { option: number }>(
            optionSchema,
            { createInitialState: (_c, option) => ({ option }) }
        );
        const OPTION = composeExoMachine(
            mOption,
            (m) =>
                withExoTransitions(m, {
                    // The group's selection expressed the way an application expresses it, one boolean per option.

                    showOption: (c) => {
                        c.attr(optionSchema.ports.x, chosen.getValue() === c.state.option);
                    },
                }),
            (m) => {
                const { showOption } = m.transitions;
                return withExoEffects(m, (effect) => {
                    effect((c) => {
                        showOption(c);
                        return chosen.onChange(() => showOption(c));
                    });
                });
            }
        );
        const GROUP = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let options!: TExoChildrenPort;
                b.el('form', null, (f) => {
                    options = f.childrenPort();
                });
                return { options };
            },
            (P): TExoMachineInitialState<TFixedList> =>
                (c) => {
                    // FIXED, not reactive: a group's options do not come and go, and `list` is what
                    // says so — no registry, no diff, and the same call adopts on a hydrated page.
                    c.list(P.options, OPTION, [0, 1, 2]);
                }
        );

        const parent = host();
        parent.innerHTML = EXO_STR.render(GROUP);
        const boxes = (): HTMLInputElement[] => Array.from(parent.querySelectorAll('input'));
        expect(parent.innerHTML).toBe(
            '<form>' +
                '<input type="radio" name="pick">' +
                '<input type="radio" name="pick" checked="">' +
                '<input type="radio" name="pick">' +
                '</form>'
        );
        expect(boxes().map((b) => b.checked)).toEqual([false, true, false]);

        // The client resolves a different selection — a saved draft, a flag that flipped while
        // the bundle was downloading — before anything is subscribed.
        chosen.setValue(2);
        EXO_BACKEND.hydrate(GROUP, parent);
        expect(boxes().map((b) => b.checked)).toEqual([false, false, true]);

        // And the group still tracks the source afterwards.
        chosen.setValue(0);
        expect(boxes().map((b) => b.checked)).toEqual([true, false, false]);
    });

    it('applies an INDETERMINATE checkbox, which no markup could have carried', () => {
        // `indeterminate` is live client state with NO attribute behind it — `EXO_DOM_PROPERTIES`
        // records that by giving the name the value `false` — so the server prints nothing for it
        // and a served page can only ever show a plain unticked box. The FILL is therefore the only
        // thing that can apply it, and it is no longer silenced: `markupCarries` answers `false` for
        // a port no markup can carry, so `compileExoHydrateSchema` leaves it holding its real setter and
        // adoption performs the write. (It used to be the REPAIR that caught this, by accident —
        // the attribute is absent, a truthy value wants it present, so the comparison reported a
        // mismatch. That worked for a bound port and never for a `set`.) The assertion is the same
        // either way, which is why it is here and not rewritten.
        const dashed = source<unknown>(true);
        const BOX = controlBoundTo('input', { type: 'checkbox' }, 'indeterminate', dashed);
        const parent = host();
        parent.innerHTML = EXO_STR.render(BOX);
        expect(parent.innerHTML).toBe('<input type="checkbox">');

        EXO_BACKEND.hydrate(BOX, parent);
        expect((parent.firstElementChild as HTMLInputElement).indeterminate).toBe(true);
    });

    it('writes NOTHING when the markup and the source already agree', () => {
        // THE COST GUARD. Comparing must not turn into writing — the whole reason hydration is
        // cheaper than rendering is that the first write is skipped when it would change nothing.
        //
        // A property write leaves no MutationRecord (records are for attributes, children and
        // character data), so what this observer actually proves is the OTHER half: the repair
        // must not touch the ATTRIBUTE either when the markup and the source already agree. It
        // is not that a property port's setter never writes an attribute — a BOOLEAN one writes
        // it BEHIND the property, so that the control's reset value follows its data (see
        // `exo-attr-setter`, and `property-parity.test.ts` for the `form.reset()` case), and this
        // is a `checked` port, so that setter is exactly the one under the observer. What must not
        // happen is any write at all on a page that is already right, which is the saving
        // hydration exists for.
        const box = source<unknown>(true);
        const BOX = controlBoundTo('input', { type: 'checkbox' }, 'checked', box);
        const parent = host();
        parent.innerHTML = EXO_STR.render(BOX);

        let mutations = 0;
        const observer = new MutationObserver((records) => {
            mutations += records.length;
        });
        observer.observe(parent, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
        EXO_BACKEND.hydrate(BOX, parent);
        mutations += observer.takeRecords().length;
        observer.disconnect();

        expect(mutations).toBe(0);
        expect((parent.firstElementChild as HTMLInputElement).checked).toBe(true);
    });

    it('repairs a stale CLASS, which has no removal case and needed no exemption', () => {
        // `class` goes through the `className` PROPERTY and has no removal rule at all — `null`
        // coerces to `''` and leaves `class=""` standing — so it does not share a rule with an
        // ordinary attribute and could not simply be folded into one. What it does NOT need is an
        // exemption: given its own rule, a stale class is repaired like anything else, including
        // all the way down to the empty string, which is the value the old code's `null` early
        // return could never reach.
        const cls = source<unknown>('from-the-server');
        const DIV = controlBoundTo('div', null, 'class', cls);
        const parent = host();
        parent.innerHTML = EXO_STR.render(DIV);
        expect(parent.innerHTML).toBe('<div class="from-the-server"></div>');

        cls.setValue(null);
        EXO_BACKEND.hydrate(DIV, parent);
        expect(parent.firstElementChild?.getAttribute('class')).toBe('');
    });
});
