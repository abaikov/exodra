// @vitest-environment jsdom
//
// THE PORT THAT IS A REFERENCE TO ITS ELEMENT — `b.refPort()`, and the accessor pair that reads it.
//
// WHAT IT IS FOR. Every other port kind bundles a REFERENCE with a WRITER: it says where a value
// goes and how it is written there. This one is the reference on its own, so that a wire can obtain
// the ELEMENT — to observe it, focus it, measure it, hand it to a library — and has no way at all
// to write to it. Writing to it is a TYPE error, and that assertion lives in
// `packages/type-tests/src/ref-port.ts`, because a thing that does not compile cannot
// be asserted from inside a suite that has to compile.
//
// WHAT EACH CASE HERE PROTECTS:
//
//  1. THE ACCESSOR RESOLVES THE ELEMENT THE PORT STANDS ON, and hands back the SAME object twice.
//     A reader that re-derived the node would be a different bug on each call.
//  2. THE TABLE IS THE INSTANCE'S. Two rows of one list run through ONE pooled exonode — the
//     exonode is per (schema, depth) and is handed to the next row — so a reader that resolved
//     through `this` would answer about whichever row was wired last. Both rows are read AFTER the
//     whole render has finished, which is the moment that mistake becomes visible.
//  3. NOTHING OF A REF PORT REACHES THE PROTOTYPE. It takes a port NUMBER, because skipping one
//     would renumber every port after it and the wire is shared across backends, and it emits no
//     bytes at all. The cases at the bottom pin that: the prototype carries the static attributes
//     and nothing else, and an attribute port declared BEFORE a ref port still comes out of the
//     prototype the way a lone one does.
import type {
    TExoSchemaCursor,
    TExoMachine,
    TExoPort,
    TExoRefPort,
    TExoPortNodeReader,
    TExoPortTable,
    TExoAttrPort,
    TExoTextPort,
    TExoChildrenPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { exoDomSchemaOf } from '../exoDomSchemaOf';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

/**
 * WHAT A WIRE THAT READS AN ELEMENT NEEDS OF AN EXONODE, and nothing more — the instance's table,
 * the schema's reader, and `set` for the text beside it. A method type, so the real exonodes
 * satisfy it structurally.
 */
type TReading = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    portTable(): TExoPortTable;
    portNodeReader(): TExoPortNodeReader<Element>;
};

/** What the shell fills: a fixed list of rows. */
type TListing = {
    list(port: TExoPort, component: TExoMachine<never>, count: number): void;
};

/** What one row handed out while it was being wired, kept so the test can read it afterwards. */
type THandle = {
    readonly table: TExoPortTable;
    readonly at: TExoPortNodeReader<Element>;
    /** The two reads made DURING the wire, so identity across reads is testable. */
    readonly first: Element;
    readonly second: Element;
};

const HANDLES: THandle[] = [];

/** The row's ref port, hoisted out of the factory so a late read can name it. */
let ROW_BOX!: TExoRefPort;

/** `<li class="row"><span class="label">…</span><b class="probe"></b></li>` */
const ROW = createExoTestMachine(
    (b) => {
        let box!: TExoRefPort;
        let label!: TExoTextPort;
        b.el('li', { class: 'row' }, (li) => {
            li.el('span', { class: 'label' }, (s) => {
                label = s.textPort();
            });
            li.el('b', { class: 'probe' }, (probe) => {
                box = probe.refPort();
            });
        });
        return { box, label };
    },
    (P): TExoMachineInitialState<TReading> => {
        ROW_BOX = P.box;
        return (c, i) => {
            c.text(P.label, `row ${i}`);
            const table = c.portTable();
            const at = c.portNodeReader();
            HANDLES.push({ table, at, first: at(table, P.box), second: at(table, P.box) });
        };
    }
);

/** `<ul class="rows">{two rows}</ul>` — a fixed list, so both rows share a schema and a reader. */
const LIST = createExoTestMachine(
    (b) => {
        let rows!: TExoPort;
        b.el('ul', { class: 'rows' }, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    },
    (P): TExoMachineInitialState<TListing> =>
        (c) => {
            c.list(P.rows, ROW, 2);
        }
);

describe('a ref port', () => {
    it('resolves the element it stands on, and the same object across two reads', () => {
        HANDLES.length = 0;
        const parent = host();
        EXO_BACKEND.render(LIST, parent);

        const rows = parent.querySelectorAll('li.row');
        expect(rows.length).toBe(2);

        const handle = HANDLES[0];
        const probe = rows[0].querySelector('b.probe');
        // The element the port stands on — the `<b>`, not the row and not the instance root.
        expect(handle.first).toBe(probe);
        // And the same OBJECT on the second read, not an equal one.
        expect(handle.second).toBe(handle.first);
        // And still the same object read after the whole render has finished, which is the read a
        // subscriber or an effect actually makes.
        expect(handle.at(handle.table, ROW_BOX)).toBe(probe);
    });

    it('gives two instances different nodes, and one table does not see the other', () => {
        HANDLES.length = 0;
        const parent = host();
        EXO_BACKEND.render(LIST, parent);

        const rows = parent.querySelectorAll('li.row');
        const [a, b] = HANDLES;

        // The two rows share ONE reader function, made once per (schema, depth). Read them both,
        // after both wires have returned — a reader that resolved a node from anything but the TABLE
        // it is handed would answer with row 1's node for both.
        expect(a.at(a.table, ROW_BOX)).toBe(rows[0].querySelector('b.probe'));
        expect(b.at(b.table, ROW_BOX)).toBe(rows[1].querySelector('b.probe'));
        expect(a.at(a.table, ROW_BOX)).not.toBe(b.at(b.table, ROW_BOX));

        // The reader itself is the PLAN's and is shared; it is the TABLE that carries the instance.
        // Crossing them is not a mistake the types can catch (a table is one opaque token whatever
        // instance it came from), so this states what the two arguments mean: the same reader over
        // the other row's table answers about the other row.
        expect(a.at(b.table, ROW_BOX)).toBe(rows[1].querySelector('b.probe'));
    });

    it('leaves restore null for a component whose ports are a ref port and text', () => {
        const SUB = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let box!: TExoRefPort;
                let label!: TExoTextPort;
                b.el('p', { class: 'sub' }, (p) => {
                    box = p.refPort();
                    label = p.textPort();
                });
                return { box, label };
            },
            (P): TExoMachineInitialState<TReading> =>
                (c) => {
                    c.text(P.label, 'x');
                }
        );

        const schema = exoDomSchemaOf(SUB, EXO_BACKEND);
        // The prototype carries the ONE static attribute and no other, so a ref port left nothing
        // behind. The text port's node is there and empty, which is why the serialisation shows
        // no content either.
        expect(schema.proto.getAttributeNames()).toEqual(['class']);
        expect(schema.html).toBe('<p class="sub"></p>');
    });

    it('leaves an attribute port declared before it out of the prototype', () => {
        const BOX = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let cls!: TExoAttrPort;
                let box!: TExoRefPort;
                b.el('div', null, (d) => {
                    cls = d.port('class');
                    // Declared AFTER the attribute port: a ref port emits no bytes, so it must not
                    // change what the `class` port does to the prototype.
                    box = d.refPort();
                });
                return { cls, box };
            },
            (P): TExoMachineInitialState<TReading> =>
                (c) => {
                    c.attr(P.cls, 'filled');
                }
        );

        const schema = exoDomSchemaOf(BOX, EXO_BACKEND);
        expect(schema.proto.hasAttribute('class')).toBe(false);

        // And the port still fills, appending into the position the server prints it in.
        const parent = host();
        EXO_BACKEND.render(BOX, parent);
        expect((parent.firstElementChild as Element).getAttribute('class')).toBe('filled');
    });

    it('takes a port number beside two attribute ports and costs the instance nothing', () => {
        // TWO attribute ports on one element plus a ref port. The ref port owns a NUMBER — the
        // setters table is three long — and no fill call reaches it, so the rendered element is
        // the one its twin without the port would produce.
        const PAIR = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let a!: TExoAttrPort;
                let z!: TExoAttrPort;
                let box!: TExoRefPort;
                b.el('div', null, (d) => {
                    a = d.port('data-a');
                    z = d.port('data-b');
                    box = d.refPort();
                });
                return { a, z, box };
            },
            (P): TExoMachineInitialState<TReading> =>
                (c) => {
                    c.attr(P.a, '1');
                    c.attr(P.z, '2');
                }
        );

        const schema = exoDomSchemaOf(PAIR, EXO_BACKEND);
        expect(schema.setters.length).toBe(3);

        // The wire fills them in declaration order, which is the order they come out in.
        const parent = host();
        EXO_BACKEND.render(PAIR, parent);
        expect((parent.firstElementChild as Element).outerHTML).toBe(
            '<div data-a="1" data-b="2"></div>'
        );
    });
});
