// THE SERVER'S HALF OF THE PARSER-STABILITY REFUSAL, which nothing pinned until this file.
//
// `compileExoStrSchema` asks `assertExoParserStableText` and `assertExoParserStableChild` on every
// static text run and every child, and it asks them UNCONDITIONALLY — unlike `@exodra/dom`, which
// only asks when the composition says the page was parsed. That is the right asymmetry: a served
// page IS bytes a parser reads, so the server always meets one.
//
// It was asserted nowhere. The only tests naming these refusals go through the DOM compiler
// (`dom/src/tests/void-and-shape.test.ts`), so deleting either call here would have left every
// suite green while the server printed markup a browser silently reshapes — the schema puts the
// text inside the table, the browser moves it out, and the hydrating client then disagrees with
// the page it was handed.
import { describe, expect, it } from 'vitest';
import { createExoSchema } from '@exodra/core';
import type { TExoSchemaCursor } from '@exodra/core';
import { compileExoStrSchema } from '../compileExoStrSchema';
import { ExoStrBackend } from '../../node/ExoStrBackend';

const EXO_STR = new ExoStrBackend();

// SPELLED OUT, not `Parameters<typeof createExoSchema>[0]`: that reads the FIRST of three
// overloads through an uninstantiated generic, so the cursor resolves to nothing and every
// builder callback below is an implicit `any`.
const compile = (build: (cursor: TExoSchemaCursor) => Record<string, unknown>): void => {
    compileExoStrSchema(createExoSchema(build), EXO_STR);
};

describe('the server refuses the markup a parser would reshape', () => {
    it('refuses a static text run that a table foster-parents out', () => {
        expect(() =>
            compile((b) => {
                b.el('table', null, (table) => {
                    table.text('loose');
                });
                return {};
            })
        ).toThrow(/FOSTER-PARENTED/);
    });

    it('takes whitespace inside a table, which the parser leaves alone', () => {
        expect(() =>
            compile((b) => {
                b.el('table', null, (table) => {
                    table.text('   ');
                });
                return {};
            })
        ).not.toThrow();
    });

    it('refuses a child the parser moves out of its parent', () => {
        expect(() =>
            compile((b) => {
                b.el('table', null, (table) => {
                    table.el('div', null, (d) => d.text('x'));
                });
                return {};
            })
        ).toThrow(/reshapes this schema's markup/);
    });

    it('takes the children a table may actually hold', () => {
        expect(() =>
            compile((b) => {
                b.el('table', null, (table) => {
                    table.el('tbody', null, (body) => {
                        body.el('tr', null, (row) => {
                            row.el('td', null, (cell) => cell.text('cell'));
                        });
                    });
                });
                return {};
            })
        ).not.toThrow();
    });
});
