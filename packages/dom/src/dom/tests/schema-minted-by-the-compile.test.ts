// @vitest-environment jsdom
//
// WHO HANDS OUT THE PORT NUMBERS NOW. `createExoSchema` does not run the markup function: it keeps
// it, keeps whatever `exoPorts` declared, and returns. So the FIRST replay to reach a declaration
// mints — a backend's schema compile, or the harvest that asking for `ports`/`rootTag` performs —
// and every replay after it must FIND the ports standing at the positions its own calls arrive in,
// because a port appended twice renumbers everything after it and a wire filling by the old number
// reaches somebody else's setter.
//
// The four orders below are the whole of the claim: DOM first, string first, harvest first, and
// both backends over one schema.
import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachine } from '@exodra/core';
import { createExoSchema, harvestExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoSchemaCursor, TExoTextPort } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend, exoDomSchemaOf, withExoForeignNamespaces } from '@exodra/dom';
import { ExoStrBackend, exoStrSchemaOf } from '@exodra/string';
import { createExoTestMachine } from '@exodra/test-utils';

const machineOf = (declaration: TExoCursorDeclaration<unknown>): TExoMachine<never> => ({
    declaration,
    forms: [],
    createInitialState: null,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
});

const EXO_BACKEND = withExoForeignNamespaces(new ExoDomBackend());
const OTHER_BACKEND = withExoForeignNamespaces(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

type TCardPorts = { id: TExoAttrPort; title: TExoTextPort; note: TExoTextPort };

const cardOf = (
    runs: { count: number } = { count: 0 }
): { build: (b: TExoSchemaCursor) => TCardPorts; runs: { count: number } } => ({
    runs,
    build: (b: TExoSchemaCursor): TCardPorts => {
        runs.count++;
        let id!: TExoAttrPort;
        let title!: TExoTextPort;
        let note!: TExoTextPort;
        b.el('article', { class: 'card' }, (card) => {
            id = card.port('data-id');
            card.el('h3', null, (h) => {
                title = h.textPort();
            });
            card.el('p', null, (p) => {
                note = p.textPort();
            });
        });
        return { id, title, note };
    },
});

describe('a schema nobody has asked anything of', () => {
    it('runs the markup ONCE for a DOM compile, and the compile is what mints', () => {
        const card = cardOf();
        const schema = createExoSchema(card.build);
        expect(card.runs.count).toBe(0);
        expect(schema.portList).toHaveLength(0);

        exoDomSchemaOf(machineOf(schema), EXO_BACKEND);

        expect(card.runs.count).toBe(1);
        expect(schema.portList).toHaveLength(3);
        expect(schema.portList.map((port) => port.index)).toEqual([0, 1, 2]);
    });

    it('runs the markup ONCE for a string compile too', () => {
        const card = cardOf();
        const schema = createExoSchema(card.build);

        exoStrSchemaOf(machineOf(schema), EXO_STR);

        expect(card.runs.count).toBe(1);
        expect(schema.portList).toHaveLength(3);
    });
});

describe('the replay that comes second', () => {
    it('finds the ports a DOM compile minted rather than appending its own', () => {
        const card = cardOf();
        const schema = createExoSchema(card.build);
        exoDomSchemaOf(machineOf(schema), EXO_BACKEND);
        const minted = schema.portList.slice();

        exoStrSchemaOf(machineOf(schema), EXO_STR);
        exoDomSchemaOf(machineOf(schema), OTHER_BACKEND);
        harvestExoSchema(schema);

        expect(schema.portList).toHaveLength(3);
        expect(schema.portList).toEqual(minted);
        expect(schema.ports.title).toBe(minted[1]);
        expect(schema.ports.title.index).toBe(1);
    });

    it('finds the ports a STRING compile minted, so neither backend has to be first', () => {
        const card = cardOf();
        const schema = createExoSchema(card.build);
        exoStrSchemaOf(machineOf(schema), EXO_STR);
        const minted = schema.portList.slice();

        exoDomSchemaOf(machineOf(schema), EXO_BACKEND);

        expect(schema.portList).toEqual(minted);
        expect(card.runs.count).toBe(2);
    });

    it('costs a component TWO replays, because its wire factory takes the ports at once', () => {
        const card = cardOf();
        const component = createExoTestMachine(card.build, (P: TCardPorts) => (c, index) => {
            (c as { text(port: TExoTextPort, value: unknown): void }).text(P.title, index);
        });
        expect(card.runs.count).toBe(1);

        exoDomSchemaOf(component, EXO_BACKEND);

        expect(card.runs.count).toBe(2);
    });

    it('finds the ports the HARVEST minted, which is the order a component takes', () => {
        const card = cardOf();
        const schema = createExoSchema(card.build);
        harvestExoSchema(schema);
        const minted = schema.portList.slice();
        expect(card.runs.count).toBe(1);

        exoDomSchemaOf(machineOf(schema), EXO_BACKEND);

        expect(schema.portList).toEqual(minted);
        expect(schema.rootTag).toBe('article');
    });
});

describe('an <a> root, whose namespace only the markup BELOW it can settle', () => {
    // The one root shape that replays the markup a second time inside the compile: `<a>` is real
    // in HTML and in SVG, so `exoSvgRootedSchema` looks for an SVG-only element under it — and on
    // a schema nobody has harvested that probe is the replay that MINTS, with the emitter's own
    // replay finding the ports it left.
    it('mints from the probe and the emitter finds them, numbers and namespace both', () => {
        let runs = 0;
        const declaration = createExoSchema((b: TExoSchemaCursor) => {
            runs++;
            let cx!: TExoAttrPort;
            let label!: TExoTextPort;
            b.el('a', { href: '#x' }, (a) => {
                a.el('circle', { r: '2' }, (c) => {
                    cx = c.port('cx');
                });
                a.el('text', null, (t) => {
                    label = t.textPort();
                });
            });
            return { cx, label };
        });

        const schema = exoDomSchemaOf(machineOf(declaration), EXO_BACKEND);

        expect(runs).toBe(2);
        expect(declaration.portList).toHaveLength(2);
        expect(declaration.portList.map((port) => port.index)).toEqual([0, 1]);
        expect(schema.setters).toHaveLength(2);
        expect(schema.proto.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect((schema.proto.firstElementChild as Element).namespaceURI).toBe(
            'http://www.w3.org/2000/svg'
        );
    });
});

describe('what the compile that minted puts in the page', () => {
    it('writes through the numbers it handed out, whichever compile came first', () => {
        const card = cardOf();
        const schema = createExoSchema(card.build);
        const strSchema = exoStrSchemaOf(machineOf(schema), EXO_STR);
        const domSchema = exoDomSchemaOf(machineOf(schema), EXO_BACKEND);

        expect(strSchema.writers).toHaveLength(3);
        expect(domSchema.setters).toHaveLength(3);
        expect(schema.ports.id.name).toBe('data-id');
    });
});
