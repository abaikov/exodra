import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createExoSchema } from '../factories/createExoSchema';
import { createExoPortOfKind } from '../ports/factories/createExoPortOfKind';
import { mintExoPort } from '../ports/factories/mintExoPort';
import { EXO_PORT_ATTR } from '../ports/constants/EXO_PORT_ATTR';
import { EXO_PORT_TEXT } from '../ports/constants/EXO_PORT_TEXT';

describe('a schema refusal is a check, not a dev message: production still refuses', () => {
    let before: string | undefined;
    beforeEach(() => {
        before = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
    });
    afterEach(() => {
        process.env.NODE_ENV = before;
    });

    it('refuses a schema with two roots, with its code', () => {
        const schema = createExoSchema((b) => {
            b.el('p');
            b.el('p');
            return null;
        });
        expect(() => schema.ports).toThrow('EXO0105 2');
    });

    it('refuses a port of a different kind at a numbered position, with its code', () => {
        const supply = [createExoPortOfKind(EXO_PORT_TEXT, 0, null)];
        expect(() => mintExoPort(supply, 0, EXO_PORT_ATTR, null)).toThrow('EXO0106');
        expect(mintExoPort(supply, 0, EXO_PORT_TEXT, null)).toBe(supply[0]);
    });
});
