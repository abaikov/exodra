import { describe, expect, it } from 'vitest';

import { assertExoLegalTagName } from '../asserts/assertExoLegalTagName';
import { createExoSchema } from '../../factories/createExoSchema';
import { withExoSchemaAsserts } from '../../cursor/withExoSchemaAsserts';

import type { TExoTextPort } from '../../ports/types/TExoTextPort';
/**
 * A TAG NAME IS MARKUP, so an unchecked one is an injection. MEASURED on the built artefacts:
 * without this refusal `el('p', …, (p) => p.el('div><img src=x onerror=alert(1)', …))` renders
 * `<p><div><img src=x onerror=alert(1)></div><img src=x onerror=alert(1)></p>` through
 * `@exodra/string` — a working handler, served. `assertExoLegalAttrName` makes the identical argument about
 * attribute names.
 */
describe('a tag name cannot be markup', () => {
    /**
     * Simulate a production build the way this repository already does elsewhere
     * (`packages/dom/src/events/tests/exo-events.test.ts` is the precedent): swap the value the guard
     * reads, and restore it. This shows the BEHAVIOUR ships; the structural assertion at the bottom
     * of this file is what fails if the check moves inside a stripped condition.
     */
    const underProduction = <T>(fn: () => T): T => {
        const before = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            return fn();
        } finally {
            process.env.NODE_ENV = before;
        }
    };

    it('refuses the payload that was actually served', () => {
        expect(() =>
            createExoSchema((b) => {
                b.el('p', null, (p) => {
                    p.el('div><img src=x onerror=alert(1)', null, () => {});
                });
                return {};
            }, withExoSchemaAsserts)
        ).toThrow(/is not a legal element name/);
    });

    it('refuses it in a PRODUCTION build too — this is basket 2', () => {
        underProduction(() => {
            expect(() =>
                createExoSchema((b) => {
                    b.el('p', null, (p) => {
                        p.el('div><img src=x onerror=alert(1)', null, () => {});
                    });
                    return {};
                }, withExoSchemaAsserts)
            ).toThrow('EXO0013 "div><img src=x onerror=alert(1)"');
        });
    });

    it('names the offending tag beside the code in production, and only explains in dev', () => {
        let short = '';
        let long = '';
        underProduction(() => {
            try {
                assertExoLegalTagName('a b', 'ExoSchemaCursor.el()');
            } catch (e) {
                short = (e as Error).message;
            }
        });
        try {
            assertExoLegalTagName('a b', 'ExoSchemaCursor.el()');
        } catch (e) {
            long = (e as Error).message;
        }
        expect(short).toBe('EXO0013 "a b"');
        expect(short).not.toContain('onerror');
        expect(long).toContain('onerror');
        expect(long.startsWith('ExoSchemaCursor.el(): "a b" is not a legal element name')).toBe(
            true
        );
        expect(long).not.toContain('EXO0013');
    });

    it('refuses every shape that reaches the markup as something other than a tag', () => {
        for (const tag of [
            'div>',
            'div ',
            'a b',
            'div"',
            "div'",
            'div/',
            'div=',
            '<div',
            '',
            '1div',
            '-div',
            'div\n',
            'div\t',
        ]) {
            expect(() => assertExoLegalTagName(tag, 'ExoSchemaCursor.el()'), tag).toThrow(
                /is not a legal element name/
            );
        }
    });

    it('accepts every element the renderer is meant to build', () => {
        for (const tag of [
            'div',
            'p',
            'h1',
            'textarea',
            'svg',
            'feGaussianBlur',
            'clipPath',
            'my-widget',
            'price-chart',
            'x-2',
        ]) {
            expect(() => assertExoLegalTagName(tag, 'ExoSchemaCursor.el()'), tag).not.toThrow();
        }
    });

    it('accepts a normal schema under production, so the rule is not widened', () => {
        underProduction(() => {
            const schema = createExoSchema((b) => {
                let title!: TExoTextPort;
                b.el('article', { class: 'card' }, (a) => {
                    a.el('h2', null, (h) => {
                        title = h.textPort();
                    });
                    a.el('my-widget', null, () => {});
                });
                return { title };
            }, withExoSchemaAsserts);
            expect(schema.portList.length).toBe(1);
        });
    });
});
