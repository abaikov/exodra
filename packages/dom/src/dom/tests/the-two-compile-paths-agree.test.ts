// @vitest-environment jsdom
//
// THE DISAGREEMENT GATE between the two ways a page can get a schema: COMPILE the declaration at
// load, or take a spec a build wrote and rebuild from it with no compiler on the page at all.
//
// It is a gate and not a demonstration. The spec path re-derives three things rather than
// carrying them — the landings, every setter, and `markupMisses` — so it is a SECOND
// implementation of the end of `compileExoDomSchema`, and two implementations of one answer drift.
// What it compares is therefore every table a render reads, by value, and then the rendered DOM.
import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type { TExoCursorDeclaration, TExoMachine, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoSchemaCursor, TExoTextPort } from '@exodra/core';
import { EXO_WALK_FIRST_CHILD } from '../constants/EXO_WALK_FIRST_CHILD';
import { ExoDomBackend } from '../ExoDomBackend';
import { withExoCompiler } from '../withExoCompiler';
import { createExoDomSchema } from '../createExoDomSchema';
import { exoDomSchemaOf } from '../exoDomSchemaOf';
import { exoDomJsonDeclaration } from '../exoDomJsonDeclaration';
import type { TExoDomSchema } from '../types/TExoDomSchema';
import { createExoTestMachine } from '@exodra/test-utils';

const machineOf = (declaration: TExoCursorDeclaration<unknown>): TExoMachine<never> => ({
    declaration,
    forms: [],
    createInitialState: null,
    effects: EXO_NO_EFFECTS,
    handlers: EXO_NO_HANDLERS,
});

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

type TCardPorts = { id: TExoAttrPort; title: TExoTextPort; rows: TExoChildrenPort };

/** What the wire below assumes of an exonode — the three fill doors and nothing else, so it is
 *  satisfied by the DOM's, the server's and the adopting one alike. */
type TExoFillSurface = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

// Four shapes, and each is here for a reason the others cannot cover: a port on the root, a text
// port whose slot MOVES onto a Text node, a children port that owns its element, and a schema with
// no ports at all — the one where `sharesEmptyNodes` is true and every table is empty.
const SHAPES: ReadonlyArray<{
    readonly what: string;
    readonly build: (b: TExoSchemaCursor) => unknown;
}> = [
    {
        what: 'a card: an attribute on the root, a text port one level down, a children port',
        build: (b): TCardPorts => {
            let id!: TExoAttrPort;
            let title!: TExoTextPort;
            let rows!: TExoChildrenPort;
            b.el('article', { class: 'card' }, (card) => {
                id = card.port('data-id');
                card.el('h3', null, (h3) => {
                    title = h3.textPort();
                });
                card.el('ul', null, (ul) => {
                    rows = ul.childrenPort();
                });
            });
            return { id, title, rows };
        },
    },
    {
        what: 'a children port BETWEEN statics, which is the anchored shape',
        build: (b): { rows: TExoChildrenPort } => {
            let rows!: TExoChildrenPort;
            b.el('div', null, (d) => {
                d.el('h3', null, (h3) => h3.text('head'));
                rows = d.childrenPort();
                d.el('footer', null, (f) => f.text('foot'));
            });
            return { rows };
        },
    },
    {
        what: 'two text ports on siblings, so two slots move onto Text nodes',
        build: (b): { a: TExoTextPort; z: TExoTextPort } => {
            let a!: TExoTextPort;
            let z!: TExoTextPort;
            b.el('p', null, (p) => {
                p.el('span', { class: 'a' }, (s) => {
                    a = s.textPort();
                });
                p.el('span', { class: 'z' }, (s) => {
                    z = s.textPort();
                });
            });
            return { a, z };
        },
    },
    {
        what: 'no ports at all',
        build: (b): Record<string, never> => {
            b.el('hr');
            return {};
        },
    },
];

// Every table a render reads, by value. `setters` and `writeData` are compared by SHAPE rather
// than by identity: an attribute writer is one shared body per kind, so the two paths hand back
// the same function object, but a text writer is chosen per element and need not be.
const tablesOf = (schema: TExoDomSchema): Record<string, unknown> => ({
    html: schema.html,
    rootTag: schema.rootTag,
    slots: schema.slots,
    walk: Array.from(schema.walk),
    hydrateWalk: Array.from(schema.hydrateWalk),
    walksAreOneTable: schema.hydrateWalk === schema.walk,
    elem: Array.from(schema.elem),
    ownsElement: Array.from(schema.ownsElement),
    markupMisses: schema.markupMisses === null ? null : Array.from(schema.markupMisses),
    childListStartSlot: Array.from(schema.childListStartSlot),
    childListEndSlot: Array.from(schema.childListEndSlot),
    adoptStopSlot: Array.from(schema.adoptStopSlot),
    childListNextPort: Array.from(schema.childListNextPort),
    childListPrevPort: Array.from(schema.childListPrevPort),
    childListPrevStatics: Array.from(schema.childListPrevStatics),
    hasAdjacentChildLists: schema.hasAdjacentChildLists,
    hasSeparatedChildLists: schema.hasSeparatedChildLists,
    hydrateUnreachable: Array.from(schema.hydrateUnreachable),
    sharesEmptyNodes: schema.sharesEmptyNodes,
    ports: schema.ports.map((port) => ({ kind: port.kind, name: port.name ?? null })),
    setters: schema.setters.map((setter) => setter.name || 'anonymous'),
    takesTextNode: schema.setters.map((setter) => setter.takesTextNode === true),
    writeData: schema.writeData.map((datum) => typeof datum),
});

describe('a schema rebuilt from a spec says what the compile said', () => {
    for (const shape of SHAPES) {
        it(`agrees on every table: ${shape.what}`, () => {
            const declaration = createExoSchema(shape.build as (b: TExoSchemaCursor) => object);
            const compiled = exoDomSchemaOf(machineOf(declaration), EXO_BACKEND);
            const spec = exoDomJsonDeclaration(compiled);

            const rebuilt = createExoDomSchema(spec, EXO_BACKEND);

            expect(tablesOf(rebuilt)).toEqual(tablesOf(compiled));
        });
    }

    it('survives a round trip through JSON, which is what a build writes', () => {
        const declaration = createExoSchema(SHAPES[0].build as (b: TExoSchemaCursor) => object);
        const compiled = exoDomSchemaOf(machineOf(declaration), EXO_BACKEND);

        const spec = JSON.parse(JSON.stringify(exoDomJsonDeclaration(compiled))) as ReturnType<
            typeof exoDomJsonDeclaration
        >;
        const rebuilt = createExoDomSchema(spec, EXO_BACKEND);

        expect(tablesOf(rebuilt)).toEqual(tablesOf(compiled));
    });

    it('renders the same DOM through a wire that never met the declaration', () => {
        const declaration = createExoSchema(SHAPES[0].build as (b: TExoSchemaCursor) => TCardPorts);
        const component = createExoTestMachine(
            declaration.build as (b: TExoSchemaCursor) => TCardPorts,
            // THE WIRE'S SURFACE IS NAMED: without it `c` is `unknown`, because nothing in
            // `createExoTestMachine`'s second argument tells TypeScript which exonode this wire
            // assumes. Three fill doors is the whole of what it needs.
            (P: TCardPorts): TExoMachineInitialState<TExoFillSurface> =>
                (c) => {
                    c.attr(P.id, '7');
                    c.text(P.title, 'Hello');
                    c.unsafeHtml(P.rows, '<li>raw</li>');
                }
        );

        const fromCompile = document.createElement('div');
        EXO_BACKEND.render(component, fromCompile);

        // THE SAME WIRE, run against the rebuilt schema: the ports it fills by are the spec's own,
        // which is the whole claim — port NUMBERS survive being written down.
        const spec = exoDomJsonDeclaration(exoDomSchemaOf(component, EXO_BACKEND));
        const rebuilt = createExoDomSchema(spec, EXO_BACKEND);
        const P = {
            id: rebuilt.ports[0],
            title: rebuilt.ports[1],
            rows: rebuilt.ports[2],
        } as unknown as TCardPorts;
        const record = rebuilt.createInstance(rebuilt);
        const node = rebuilt.acquireNode(rebuilt);
        const nodes: Node[] = new Array(rebuilt.slots);
        nodes[0] = node;
        const walk = rebuilt.walk;
        for (let i = 0; i < walk.length; i += 3) {
            const from = nodes[walk[i + 1]];
            nodes[walk[i]] =
                walk[i + 2] === EXO_WALK_FIRST_CHILD
                    ? (from.firstChild as Node)
                    : (from.nextSibling as Node);
        }
        record.nodes = nodes;
        record.schema = rebuilt;
        const wiring = record as unknown as {
            attr(port: unknown, value: unknown): void;
            text(port: unknown, value: unknown): void;
            unsafeHtml(port: unknown, value: unknown): void;
        };
        wiring.attr(P.id, '7');
        wiring.text(P.title, 'Hello');
        wiring.unsafeHtml(P.rows, '<li>raw</li>');

        const fromSpec = document.createElement('div');
        fromSpec.appendChild(node);

        expect(fromSpec.innerHTML).toBe(fromCompile.innerHTML);
    });
});
