// @vitest-environment jsdom
//
// A BOUND *ATTRIBUTE* PORT — the plainest reactive claim this renderer makes, and the one
// nothing was asserting.
//
// `bind` branches on the port's kind exactly once and then never again. The TEXT branch has a
// whole file to itself (`text-binding.test.ts`) because it keeps a cached node and a fallback.
// The OTHER branch — the one every `class`, `data-*`, `href`, `disabled` and `aria-*` goes
// through — is three lines: write the value now, subscribe, write again on change. Three lines
// with no test.
//
// It was reached incidentally: `attach-exo-list.test.ts` and `exo-teardown-scope.test.ts` both wire
// a bound attribute in order to COUNT SUBSCRIBERS, and `hydrate-exo-rows.test.ts` pins the update on
// the adopting path. None of them ever asserts that the attribute on a client-rendered element
// carries the source's value, or that it follows the source afterwards. So the state of the
// suite before this file was: a renderer that stopped updating attributes entirely would have
// gone green, because the subscription would still be made and still be counted and still be
// ended.
//
// The REMOVAL case below is the second half and is the one with history. `null` on an ordinary
// attribute means `removeAttribute`, not the string "null" — `disabled="null"` is a disabled
// button — and `attr-parity.test.ts` pins that rule for the FIRST write, through `set`. Nothing
// pinned it for an UPDATE, which is a different call site (the setter is invoked from inside the
// subscriber) and the one a real page spends its life in.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type { TExoAttrPort, TExoMachineNode } from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

type TSource = { getValue(): unknown; onChange(cb: (...event: never[]) => void): () => void };

/** One element, one bound attribute port. The attribute name is the case under test. */
const boundAttr = (attribute: string, src: TSource) => {
    const schema = createExoSchema((b) => {
        let x!: TExoAttrPort;
        b.el('div', null, (d) => {
            x = d.port(attribute);
        });
        return { x };
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
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return src.onChange(() => show(c));
                });
            })
    );
    const { show } = machine.transitions;
    return machine;
};

const mount = (attribute: string, src: TSource) => {
    const parent = host();
    const dispose = EXO_BACKEND.render(boundAttr(attribute, src), parent);
    return { el: parent.firstElementChild as Element, dispose };
};

describe('a bound attribute port', () => {
    it('shows its initial value and follows the source', () => {
        // The floor, and it genuinely was missing. Everything else in this file guards a rule
        // somebody could reasonably delete; this one guards the feature.
        const src = source('one');
        const { el } = mount('data-x', src);

        expect(el.getAttribute('data-x')).toBe('one');
        src.setValue('two');
        expect(el.getAttribute('data-x')).toBe('two');
    });

    it('REMOVES the attribute when the value becomes null, and brings it back', () => {
        // THE RULE THAT ONLY EXISTS ON THE UPDATE PATH UNTIL SOMETHING ASSERTS IT. In HTML the
        // PRESENCE of an attribute is its value: `disabled="null"` is a disabled control and
        // `hidden="false"` is a hidden element, so the only way to express "not disabled" is for
        // the attribute not to be there. `exo-attr-setter` handles it in the one branch both
        // the first write and every later one go through — which is exactly why a "simplifying"
        // change that drops the branch would leave `attr-parity.test.ts` green (it only ever
        // fills through `set`) while every conditional attribute on every page stopped clearing.
        const src = source<unknown>('yes');
        const { el } = mount('data-x', src);
        expect(el.getAttribute('data-x')).toBe('yes');

        src.setValue(null);
        expect(el.hasAttribute('data-x')).toBe(false);

        src.setValue(undefined);
        expect(el.hasAttribute('data-x')).toBe(false);

        src.setValue(false);
        expect(el.hasAttribute('data-x')).toBe(false);

        src.setValue('back');
        expect(el.getAttribute('data-x')).toBe('back');
    });

    it('writes the empty value for `true`, not the word', () => {
        // The boolean-attribute rule, on the update path. `data-x="true"` and `data-x=""` mean
        // the same thing to a browser and are different BYTES, and the server prints the empty
        // form — so a client that wrote the word would diverge from every page it hydrates.
        const src = source<unknown>(false);
        const { el } = mount('data-x', src);
        expect(el.hasAttribute('data-x')).toBe(false);

        src.setValue(true);
        expect(el.getAttribute('data-x')).toBe('');
    });

    it('drives `class` through the property, and keeps following after a change', () => {
        // `class` does not reach `setAttribute` at all — it is written through `className`,
        // which has no removal case, so `null` leaves `class=""` standing where an ordinary
        // attribute would have vanished. That asymmetry is pinned as bytes in
        // `attr-parity.test.ts` for the first write; here it is pinned as BEHAVIOUR across an
        // update, because the two rules live in two different closures and only one of them was
        // ever exercised twice.
        const src = source<unknown>('a b');
        const { el } = mount('class', src);
        expect(el.getAttribute('class')).toBe('a b');

        src.setValue('c');
        expect(el.getAttribute('class')).toBe('c');

        src.setValue(null);
        expect(el.getAttribute('class')).toBe('');
    });

    it('writes nothing more once the render is disposed, and lets the source go', () => {
        // TWO CLAIMS, AND THE SECOND IS THE LEAK. A binding that keeps writing after teardown
        // is a wrong page; a binding that keeps its SUBSCRIPTION after teardown holds the
        // element, the wire and everything they close over alive for as long as the source
        // lives — which on a page whose store outlives its views is forever.
        const src = source('one');
        const { el, dispose } = mount('data-x', src);
        expect(src.subscribers()).toBe(1);

        dispose();
        expect(src.subscribers()).toBe(0);

        src.setValue('two');
        expect(el.getAttribute('data-x')).toBe('one');
    });
});
