import { describe, expect, it } from 'vitest';
import { createExoMachine, createExoSchema } from '@exodra/core';
import type { TExoSchemaCursor } from '@exodra/core';
import { ExoStrBackend } from '../../node/ExoStrBackend';

const compile = (build: (b: TExoSchemaCursor) => void) => () =>
    new ExoStrBackend().render(createExoMachine(createExoSchema(build)));

describe('a text port beside other content, on the server', () => {
    it('refuses a second text port in the same element', () => {
        expect(
            compile((b) => {
                b.el('pre', null, (pre) => {
                    pre.textPort();
                    pre.textPort();
                });
            })
        ).toThrow(/content port and static children/);
    });

    it('refuses a children port after a text port', () => {
        expect(
            compile((b) => {
                b.el('div', null, (div) => {
                    div.textPort();
                    div.childrenPort();
                });
            })
        ).toThrow(/content port and static children/);
    });

    it('refuses static text on either side of a text port', () => {
        expect(
            compile((b) => {
                b.el('p', null, (p) => {
                    p.textPort();
                    p.text('x');
                });
            })
        ).toThrow(/content port and static children/);
        expect(
            compile((b) => {
                b.el('p', null, (p) => {
                    p.text('x');
                    p.textPort();
                });
            })
        ).toThrow(/content port and static children/);
    });

    it('still prints a text port that is its element`s only content', () => {
        expect(
            compile((b) => {
                b.el('p', null, (p) => {
                    p.textPort();
                });
            })
        ).not.toThrow();
    });
});
