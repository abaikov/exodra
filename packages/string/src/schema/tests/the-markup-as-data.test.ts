import { describe, expect, it } from 'vitest';
import { createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoTextPort } from '@exodra/core';
import { compileExoStrSchema } from '../compileExoStrSchema';
import { ExoStrBackend } from '../../node/ExoStrBackend';

const EXO_STR = new ExoStrBackend();

// What a build-time schema would have to carry instead of a compile: the static pieces and, when
// the markup places its ports out of declaration order, which port each hole takes. The test is
// that filling by hand from those two agrees with the schema's own compiled expression, because
// `fillMarkup` IS those two and a schema whose data said something else would print a page the
// compiler never produced.
//
// A HOLE TAKES A WRITER'S OUTPUT AND NOT A VALUE: an attribute writer emits ` name="escaped"`,
// head and quotes included, so the slot an instance fills is already markup. `written` below is
// what the instance's own `values` array holds by the time `fillMarkup` reads it.
const written = (
    writers: readonly ((value: unknown) => string)[],
    values: readonly unknown[]
): string[] => values.map((value, i) => writers[i](value));
const fillByHand = (
    pieces: readonly string[],
    order: readonly number[] | null,
    values: readonly string[]
): string => {
    let html = pieces[0];
    for (let i = 0; i < pieces.length - 1; i++) {
        html += values[order === null ? i : order[i]];
        html += pieces[i + 1];
    }
    return html;
};

describe('the string schema carries its markup as data', () => {
    it('fills by hand exactly as fillMarkup does, in declaration order', () => {
        const declaration = createExoSchema((b) => {
            let id!: TExoAttrPort;
            let title!: TExoTextPort;
            b.el('li', { class: 'row' }, (li) => {
                id = li.port('data-id');
                li.el('span', null, (s) => {
                    title = s.textPort();
                });
            });
            return { id, title };
        });
        const schema = compileExoStrSchema(declaration, EXO_STR);
        const values = written(schema.writers, ['7', 'Hello']);

        expect(schema.pieces).toHaveLength(schema.portCount + 1);
        expect(schema.order).toBeNull();
        expect(fillByHand(schema.pieces, schema.order, values)).toBe(schema.fillMarkup(values));
        expect(schema.fillMarkup(values)).toBe(
            '<li class="row" data-id="7"><span>Hello</span></li>'
        );
    });

    it('carries the ORDER when an attribute is declared after a child', () => {
        // The one shape that permutes: the attribute's bytes belong inside a start tag already
        // printed, so the piece holding that `>` is split and the hole takes a LATER port number.
        const declaration = createExoSchema((b) => {
            let title!: TExoTextPort;
            let id!: TExoAttrPort;
            b.el('li', null, (li) => {
                li.el('span', null, (s) => {
                    title = s.textPort();
                });
                id = li.port('data-id');
            });
            return { title, id };
        });
        const schema = compileExoStrSchema(declaration, EXO_STR);
        const values = written(schema.writers, ['Hello', '7']);

        expect(schema.order).not.toBeNull();
        expect(schema.order).toEqual([1, 0]);
        expect(fillByHand(schema.pieces, schema.order, values)).toBe(schema.fillMarkup(values));
        expect(schema.fillMarkup(values)).toBe('<li data-id="7"><span>Hello</span></li>');
    });

    it('carries the pieces of a schema with no ports at all', () => {
        const declaration = createExoSchema((b) => {
            b.el('hr');
            return {};
        });
        const schema = compileExoStrSchema(declaration, EXO_STR);

        expect(schema.portCount).toBe(0);
        expect(schema.pieces).toEqual(['<hr>']);
        expect(schema.order).toBeNull();
        expect(fillByHand(schema.pieces, schema.order, [])).toBe('<hr>');
    });
});
