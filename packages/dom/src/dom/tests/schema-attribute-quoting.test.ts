// @vitest-environment jsdom
//
// AN ATTRIBUTE VALUE THAT TRIES TO BE MARKUP — and why this file stopped being about quoting.
//
// `compileExoDomSchema` used to build a markup string and hand it to a parser, so a value carrying a
// quote could END the attribute and open another one: ` id="x' onclick='alert(1)"` is safe only
// because the head is a DOUBLE quote, and that was the property these cases pinned. The compiler
// builds its prototype with `setAttribute` now. There is no head, no closing quote and no parser,
// so a value cannot be markup at all — it is data passed to a DOM call.
//
// What replaces the claim is the one that survives the change: the value on the prototype is the
// declared string BYTE FOR BYTE, and no second attribute appeared beside it. The third case is the
// cross-backend half — `@exodra/string` still prints a quoted head, and a browser reading those
// bytes has to arrive at the same attribute this backend built, or one page is not the other.
import type { TExoSchemaCursor, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import { exoDomSchemaOf } from '../exoDomSchemaOf';
import { createExoTestMachine } from '@exodra/test-utils';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

const inert = (build: (b: TExoSchemaCursor) => void) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            build(b);
            return {};
        },
        (): TExoMachineInitialState<unknown> => () => undefined
    );

const protoOf = (build: (b: TExoSchemaCursor) => void): Element =>
    exoDomSchemaOf(inert(build), EXO_BACKEND).proto;

describe('compileExoDomSchema writes a static attribute value as data', () => {
    it('puts the declared string on the element, byte for byte', () => {
        expect(protoOf((b) => b.el('div', { id: 'x' })).getAttribute('id')).toBe('x');
        expect(protoOf((b) => b.el('div', { id: '' })).getAttribute('id')).toBe('');

        const many = protoOf((b) => b.el('div', { id: 'a', title: 'b', 'data-k': 'c' }));
        expect(many.getAttributeNames()).toEqual(['id', 'title', 'data-k']);
        expect(many.getAttribute('title')).toBe('b');
    });

    it('keeps a quote, a backtick and a whole injected handler INSIDE the value', () => {
        expect(protoOf((b) => b.el('div', { id: "it's" })).getAttribute('id')).toBe("it's");
        expect(protoOf((b) => b.el('div', { id: 'a`b' })).getAttribute('id')).toBe('a`b');

        // The case the double-quoted head used to be the only defence for. What matters is not how
        // it serialises but that the element has ONE attribute, and `onclick` is not among them.
        const injected = protoOf((b) => b.el('div', { id: "x' onclick='alert(1)" }));
        expect(injected.getAttributeNames()).toEqual(['id']);
        expect(injected.getAttribute('id')).toBe("x' onclick='alert(1)");
    });

    // THE RULE IS STATED IN `tests/unfilled-port-parity.test.ts`: NO attribute port keeps a
    // placeholder. An unfilled port therefore leaves nothing behind, which is what the server
    // prints, and a filled one lands wherever `setAttribute` appends it.
    it('gives a LONE attribute port no placeholder', () => {
        const proto = protoOf((b) => b.el('div', null, (d) => d.port('data-id')));
        expect(proto.getAttributeNames()).toEqual([]);
    });

    // AND NEITHER DOES A PORT ANOTHER ONE FOLLOWS. This case read `['data-id']` while the first of
    // two ports on one element kept its position reserved, so that a wire filling them in reverse
    // still produced DECLARATION order. That order is given up: the prototype is bare, and two
    // ports come out in FILL order.
    it('gives the port a second one FOLLOWS no placeholder either', () => {
        const proto = protoOf((b) =>
            b.el('div', null, (d) => {
                d.port('data-id');
                d.port('data-state');
            })
        );
        expect(proto.getAttributeNames()).toEqual([]);
    });

    it('is the same attribute a browser reads out of the string backend, which still quotes', () => {
        // THE CROSS-BACKEND HALF. `@exodra/string` prints ` id="…"` and `escapeExoAttributeValue`
        // is what keeps a value inside that head; this backend has no head to escape for. The two
        // are one page only if a parser handed the server's bytes lands on the same value, so the
        // bytes go through a real parser here rather than being compared as strings.
        for (const value of ['x', "it's", 'a`b', "x' onclick='alert(1)", 'say "hi" & bye']) {
            const component = inert((b) => b.el('div', { id: value }));
            const holder = document.createElement('template');
            holder.innerHTML = EXO_STR.render(component);
            const served = holder.content.firstElementChild as Element;

            expect(served.getAttributeNames(), value).toEqual(['id']);
            expect(served.getAttribute('id'), value).toBe(value);
            expect(exoDomSchemaOf(component, EXO_BACKEND).proto.getAttribute('id')).toBe(value);
        }
    });
});
