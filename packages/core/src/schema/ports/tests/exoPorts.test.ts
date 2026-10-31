import { describe, expect, it } from 'vitest';
import { createExoSchema } from '../../factories/createExoSchema';
import { harvestExoSchema } from '../../factories/harvestExoSchema';
import { exoPorts } from '../factories/exoPorts';
import { EXO_PORT_ATTR } from '../constants/EXO_PORT_ATTR';
import { EXO_PORT_CHILDREN } from '../constants/EXO_PORT_CHILDREN';
import { EXO_PORT_EVENT } from '../constants/EXO_PORT_EVENT';
import { EXO_PORT_REF } from '../constants/EXO_PORT_REF';
import { EXO_PORT_TEXT } from '../constants/EXO_PORT_TEXT';
import { exoSchemaShape } from '../../tests/exoSchemaShape';
import type { TExoShapeNode } from '../../tests/exoSchemaShape';

describe('exoPorts', () => {
    it('gives every declared port its place in the declaration as its number', () => {
        const P = exoPorts({
            id: EXO_PORT_ATTR,
            title: EXO_PORT_TEXT,
            rows: EXO_PORT_CHILDREN,
            click: EXO_PORT_EVENT,
            box: EXO_PORT_REF,
        });

        expect(P.id.index).toBe(0);
        expect(P.title.index).toBe(1);
        expect(P.rows.index).toBe(2);
        expect(P.click.index).toBe(3);
        expect(P.box.index).toBe(4);
    });

    it('mints one port of the declared KIND for each key', () => {
        const P = exoPorts({
            id: EXO_PORT_ATTR,
            title: EXO_PORT_TEXT,
            rows: EXO_PORT_CHILDREN,
            click: EXO_PORT_EVENT,
            box: EXO_PORT_REF,
        });

        expect(P.id.kind).toBe(EXO_PORT_ATTR);
        expect(P.title.kind).toBe(EXO_PORT_TEXT);
        expect(P.rows.kind).toBe(EXO_PORT_CHILDREN);
        expect(P.click.kind).toBe(EXO_PORT_EVENT);
        expect(P.box.kind).toBe(EXO_PORT_REF);
    });

    it('leaves an attribute port unnamed until the markup places it', () => {
        const P = exoPorts({ id: EXO_PORT_ATTR, click: EXO_PORT_EVENT });
        expect(P.id.name).toBeNull();
        expect(P.click.name).toBeNull();

        harvestExoSchema(
            createExoSchema(P, (b) => {
                b.el('div', null, (d) => {
                    d.attrPort(P.id, 'data-id');
                    d.eventPort(P.click, 'click');
                });
            })
        );

        expect(P.id.name).toBe('data-id');
        expect(P.click.name).toBe('click');
    });

    it('carries the DECLARED ports into the schema, the same objects the markup placed', () => {
        const P = exoPorts({
            id: EXO_PORT_ATTR,
            title: EXO_PORT_TEXT,
            rows: EXO_PORT_CHILDREN,
        });
        const schema = createExoSchema(P, (b) => {
            b.el('div', { class: 'card' }, (d) => {
                d.attrPort(P.id, 'data-id');
                d.el('h3', null, (h) => {
                    h.textPort(P.title);
                });
                d.childrenPort(P.rows);
            });
        });

        expect(schema.ports).toBe(P);
        expect(schema.declaredPorts).toBe(3);
        expect(schema.portList).toEqual([P.id, P.title, P.rows]);
        const root = exoSchemaShape(schema);
        expect(root.attrPorts[0]).toBe(P.id);
        expect((root.kids[0] as TExoShapeNode).content).toBe(P.title);
        expect(root.kids[1]).toBe(P.rows);
    });

    it('numbers a port the markup mints after the declared block', () => {
        const P = exoPorts({ id: EXO_PORT_ATTR });
        const schema = createExoSchema(P, (b) => {
            b.el('div', null, (d) => {
                d.attrPort(P.id, 'data-id');
                d.textPort();
            });
        });
        harvestExoSchema(schema);

        expect(schema.declaredPorts).toBe(1);
        expect(schema.portList).toHaveLength(2);
        expect(schema.portList[1].index).toBe(1);
        expect(schema.portList[1].kind).toBe(EXO_PORT_TEXT);
    });

    it('takes a declared port that the markup never places, and keeps its number', () => {
        const P = exoPorts({ id: EXO_PORT_ATTR, title: EXO_PORT_TEXT });
        const schema = createExoSchema(P, (b) => {
            b.el('div', null, (d) => {
                d.textPort(P.title);
            });
        });

        expect(schema.portList).toEqual([P.id, P.title]);
        expect(exoSchemaShape(schema).attrPorts).toHaveLength(0);
    });
});
