// @vitest-environment jsdom
//
// WHERE `subtreeHoldsPorts` WENT. A schema used to be a tree, and every element on it carried a
// flag saying whether a port stood anywhere below — set by walking up from each port as the tree
// was built, read here to decide that the element needed no slot in the walk. There is no tree and
// no flag: an element is given a slot when something ASKS for one, and a port asking its own
// element is what walks up. The observable fact is the same one, and it is this file.
import type { TExoSchemaCursor, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { exoDomSchemaOf } from '../exoDomSchemaOf';
import { ExoDomBackend } from '@exodra/dom';
import type { TExoDomSchema } from '../types/TExoDomSchema';
import { createExoTestMachine } from '@exodra/test-utils';

const EXO_BACKEND = new ExoDomBackend();

const schemaOf = (build: (b: TExoSchemaCursor) => void): TExoDomSchema =>
    exoDomSchemaOf(
        createExoTestMachine(
            (b: TExoSchemaCursor) => {
                build(b);
                return {};
            },
            (): TExoMachineInitialState<unknown> => () => undefined
        ),
        EXO_BACKEND
    );

describe('an element nothing asks about gets no slot', () => {
    it('walks to none of a port-free subtree, however deep it is', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.el('header', null, (h) => {
                    h.el('h1', null, (t) => t.text('static'));
                });
            });
        });

        expect(schema.walk).toHaveLength(0);
        expect(schema.slots).toBe(1);
    });

    it('walks to every element between the root and a port, and to nothing beside them', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.el('header', null, (h) => {
                    h.el('h1', null, (t) => t.text('static'));
                });
                d.el('section', null, (s) => {
                    s.el('span', null, (sp) => sp.textPort());
                });
            });
        });

        // <header> is a STEPPING STONE — the walk hops to the root's first child and on to its
        // next sibling — while its <h1>, which nothing has to step over, is never reached at all.
        // So: the root, <header>, <section>, its <span> and the span's Text node.
        expect(schema.slots).toBe(5);
        expect(schema.walk).toHaveLength(12);
        expect(schema.elem).toHaveLength(1);
        expect(schema.protoLandings[schema.elem[0]].nodeType).toBe(3);
    });

    it('asks for a slot on the element holding a CHILDREN port and on its ancestors', () => {
        const schema = schemaOf((b) => {
            b.el('div', null, (d) => {
                d.el('aside', null, (a) => {
                    a.el('ul', null, (u) => u.childrenPort());
                });
            });
        });

        expect(schema.slots).toBe(3);
        expect((schema.protoLandings[schema.elem[0]] as Element).localName).toBe('ul');
    });
});
