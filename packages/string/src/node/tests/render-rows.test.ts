import type { TExoSchemaCursor, TExoChildrenPort, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import type { TExoStrMachine } from '../types/TExoStrMachine';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';

import { buildRow, createExoTestMachine } from '@exodra/test-utils';
import { ExoStrBackend } from '@exodra/string';

// ONE BACKEND FOR THE WHOLE FILE, because a backend is the schema cache key and it is compared by
// pointer: a second one built per test would recompile every schema, markup parse included.
const EXO_STR = new ExoStrBackend();

type TRowPorts = ReturnType<typeof buildRow>;

// One shape, many wires: the ports arrive as the factory's argument, so no call site is handed the
// two halves separately to pair up itself.
const rowWith = (
    make: (ports: TRowPorts) => TExoMachineInitialState<TExoStrNode>
): TExoStrMachine => createExoTestMachine(buildRow, make);

// A `<ul>` with nothing in it but a children port.
function buildList(b: TExoSchemaCursor) {
    let slot!: TExoChildrenPort;
    b.el('ul', { class: 'list' }, (ul) => {
        slot = ul.childrenPort();
    });
    return { slot };
}

// `render` renders ONE instance and hands it index `0`, so a case about rows 0 and 1 says so with
// `c.list`. A schema is one element — a second root is refused — so the `<ul>` is part of the output
// and the byte expectations include it.
const listOf = (row: TExoStrMachine, items: readonly number[]): TExoStrMachine =>
    createExoTestMachine(
        buildList,
        (P): TExoMachineInitialState<TExoStrNode> =>
            (c) => {
                c.list(P.slot, row, items);
            }
    );

describe('the string backend renders', () => {
    it('renders the row the benchmark renders, byte for byte', () => {
        const ROW = rowWith((P) => (c, i) => {
            // Deliberately NOT in document order: a wiring function names ports by
            // identity, so the order it fills them in must not matter.
            c.text(P.count, 0);
            c.on(P.click, () => undefined);
            c.attr(P.id, i);
            c.attr(P.mark, i);
            c.text(P.label, 'Item ' + i);
        });

        expect(EXO_STR.render(listOf(ROW, [0, 1]))).toBe(
            '<ul class="list">' +
                '<li class="row" data-id="0"><span class="row__label">Item 0</span>' +
                '<button class="row__btn" data-b="0">0</button></li>' +
                '<li class="row" data-id="1"><span class="row__label">Item 1</span>' +
                // `count` is 0 for every row: the counter's initial value, not the row number.
                '<button class="row__btn" data-b="1">0</button></li>' +
                '</ul>'
        );
    });

    it('prints nothing for an event port, and does not shift the ports after it', () => {
        // The listener occupies a slot so both backends number their schemas identically, and puts
        // no byte in the output: were the slot dropped, `count` below would land in `data-b`.
        const ROW = rowWith((P) => (c) => {
            c.attr(P.id, 'a');
            c.text(P.label, 'l');
            c.attr(P.mark, 'b');
            c.on(P.click, () => undefined);
            c.text(P.count, 'c');
        });
        const html = EXO_STR.render(ROW);
        expect(html).toContain('data-b="b"');
        expect(html).toContain('>c</button>');
        expect(html).not.toContain('click');
    });

    it('escapes a text value for a text position', () => {
        const ROW = rowWith((P) => (c) => {
            c.attr(P.id, '');
            c.attr(P.mark, '');
            c.text(P.count, '');
            c.on(P.click, () => undefined);
            c.text(P.label, '<b>a & b</b>');
        });
        expect(EXO_STR.render(ROW)).toContain('&lt;b&gt;a &amp; b&lt;/b&gt;');
    });

    it('escapes an attribute value, INCLUDING angle brackets', () => {
        // `setAttribute('x','a<b>')` serialises as `x="a&lt;b&gt;"`, so leaving `<` and `>` raw
        // inside a quoted value produces bytes the client would never produce.
        const ROW = rowWith((P) => (c) => {
            c.text(P.label, '');
            c.attr(P.mark, '');
            c.text(P.count, '');
            c.on(P.click, () => undefined);
            c.attr(P.id, 'a<b>"c"&d');
        });
        expect(EXO_STR.render(ROW)).toContain('data-id="a&lt;b&gt;&quot;c&quot;&amp;d"');
    });

    it("does not leak a previous row's value into a port the next row left unfilled", () => {
        // Every row is its own instance with its own slot array, born `''`. A wire may skip a port,
        // and a shared array reset between rows is what lets row N inherit row N-1's text.
        const ROW = rowWith((P) => (c, i) => {
            c.attr(P.id, i);
            c.attr(P.mark, i);
            c.on(P.click, () => undefined);
            c.text(P.count, '');
            if (i === 0) c.text(P.label, 'only in the first');
        });
        const html = EXO_STR.render(listOf(ROW, [0, 1]));
        expect(html.indexOf('only in the first')).toBe(html.lastIndexOf('only in the first'));
    });
});
