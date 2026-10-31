// @vitest-environment jsdom
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../dom/ExoDomBackend';
import { exoDomSchemaOf } from '../dom/exoDomSchemaOf';
import { withExoForeignNamespaces } from '../dom/withExoForeignNamespaces';

const SVG = createExoMachineBuilder(
    createExoSchema((b) => {
        b.el('svg', { viewBox: '0 0 1 1' }, (svg) => {
            svg.el('circle', { r: '1' });
        });
        return null;
    })
).done();
const CIRCLE = createExoMachineBuilder(
    createExoSchema((b) => {
        b.el('circle', { r: '1' });
        return null;
    })
).done();

describe('SVG and MathML are a pack', () => {
    it('refuses SVG markup by name on a backend composed without it', () => {
        expect(() => exoDomSchemaOf(SVG as never, new ExoDomBackend())).toThrow(
            /withExoForeignNamespaces/
        );
        expect(() => exoDomSchemaOf(CIRCLE as never, new ExoDomBackend())).toThrow(/circle/);
    });

    it('builds SVG in its namespace, with adjusted attribute case, when composed', () => {
        const backend = withExoForeignNamespaces(new ExoDomBackend());
        const schema = exoDomSchemaOf(SVG as never, backend);
        const root = (schema as unknown as { proto: Element }).proto;
        expect(root.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(root.getAttribute('viewBox')).toBe('0 0 1 1');
    });
});
