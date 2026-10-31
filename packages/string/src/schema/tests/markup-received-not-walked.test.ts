import { describe, expect, it } from 'vitest';
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import type { TExoCursorDeclaration, TExoSchemaCursor } from '@exodra/core';
import { compileExoStrSchema } from '../compileExoStrSchema';
import { ExoStrBackend } from '../../node/ExoStrBackend';

const EXO_STR = new ExoStrBackend();

function schemaOf(build: (b: TExoSchemaCursor) => void): ReturnType<typeof compileExoStrSchema> {
    const schema = createExoSchema((b) => {
        build(b);
        return {};
    });
    return compileExoStrSchema(schema, EXO_STR);
}

// One render: every port through its own writer, in PORT NUMBER order, then the markup filled.
function render(
    schema: ReturnType<typeof compileExoStrSchema>,
    values: readonly unknown[]
): string {
    return schema.fillMarkup(values.map((value, i) => schema.writers[i](value)));
}

describe('an attribute port declared after a child', () => {
    it('prints inside the start tag, where the element it belongs to has already gone by', () => {
        const schema = schemaOf((b) => {
            b.el('li', null, (li) => {
                li.el('span', null, (span) => {
                    span.textPort();
                });
                li.port('data-id');
            });
        });
        // Port 0 is the span's text — declared first — and port 1 the attribute, whose bytes
        // belong in front of a `>` the emitter had already written.
        expect(render(schema, ['hello', '7'])).toBe('<li data-id="7"><span>hello</span></li>');
    });

    it('takes a SECOND late attribute on the same element', () => {
        const schema = schemaOf((b) => {
            b.el('li', { class: 'row' }, (li) => {
                li.el('span');
                li.port('data-id');
                li.port('data-k');
            });
        });
        expect(render(schema, ['7', 'k'])).toBe(
            '<li class="row" data-id="7" data-k="k"><span></span></li>'
        );
    });

    it('takes a late attribute on an element whose start tag is still the pending piece', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.text('x');
                d.port('data-id');
            });
        });
        expect(render(schema, ['7'])).toBe('<div data-id="7">x</div>');
    });

    it('takes a late attribute on an ANCESTOR, under a child that cut pieces of its own', () => {
        const schema = schemaOf((b) => {
            b.el('section', null, (s) => {
                s.el('p', null, (p) => {
                    p.port('data-p');
                    p.textPort();
                });
                s.port('data-s');
            });
        });
        expect(render(schema, ['a', 'b', 'c'])).toBe(
            '<section data-s="c"><p data-p="a">b</p></section>'
        );
    });

    it('removes the attribute when the value is null, exactly as an in-order one does', () => {
        const schema = schemaOf((b) => {
            b.el('li', null, (li) => {
                li.el('span');
                li.port('data-id');
            });
        });
        expect(render(schema, [null])).toBe('<li><span></span></li>');
    });
});

describe('whether a children port OWNS its element is decided when the element CLOSES', () => {
    it('lets raw markup through when nothing else stands in the element', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.childrenPort();
            });
        });
        expect(render(schema, ['<b>x</b>'])).toBe('<div><b>x</b></div>');
    });

    it('refuses it when a static element arrives AFTER the port', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.childrenPort();
                d.el('hr');
            });
        });
        expect(() => render(schema, ['<b>x</b>'])).toThrow(/EXO0057|shares its element/);
    });

    it('refuses it when a static element stands in FRONT of the port', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.el('hr');
                d.childrenPort();
            });
        });
        expect(() => render(schema, ['<b>x</b>'])).toThrow(/EXO0057|shares its element/);
    });
});

describe('what the emitter knows about an element it is still inside', () => {
    it('refuses static text after a children port, which the two backends would place apart', () => {
        expect(() =>
            schemaOf((b) => {
                b.el('ul', null, (ul) => {
                    ul.childrenPort();
                    ul.text('tail');
                });
            })
        ).toThrow(/children port/);
    });

    it('gives the optional newline to a port that OWNS a <pre>, and the ownership is patched last', () => {
        const schema = schemaOf((b) => {
            b.el('pre', null, (pre) => {
                pre.childrenPort();
            });
        });
        expect(render(schema, ['\n<b>x</b>'])).toBe('<pre>\n\n<b>x</b></pre>');
    });
});

describe('a schema whose ports are DECLARED before the markup places them', () => {
    const P = exoPorts({
        id: EXO_PORT_ATTR,
        title: EXO_PORT_TEXT,
        rows: EXO_PORT_CHILDREN,
    });
    const SCHEMA: TExoCursorDeclaration<typeof P> = createExoSchema(P, (b) => {
        b.el('div', { class: 'card' }, (d) => {
            d.el('h3', null, (h) => {
                h.textPort(P.title);
            });
            d.el('ul', null, (u) => {
                u.childrenPort(P.rows);
            });
            d.attrPort(P.id, 'data-id');
        });
    });

    it('fills each port by its DECLARED number however the markup ordered them', () => {
        const schema = compileExoStrSchema(SCHEMA, EXO_STR);
        // `id` is port 0 although its bytes are the last the emitter wrote, and `rows` is port 2
        // although its bytes come before `id`'s.
        expect(render(schema, ['7', 'Title', '<li>a</li>'])).toBe(
            '<div class="card" data-id="7"><h3>Title</h3><ul><li>a</li></ul></div>'
        );
    });

    it('prints nothing for a port nobody filled, on either side of the reorder', () => {
        const schema = compileExoStrSchema(SCHEMA, EXO_STR);
        expect(render(schema, [null, null, null])).toBe(
            '<div class="card"><h3></h3><ul></ul></div>'
        );
    });
});
