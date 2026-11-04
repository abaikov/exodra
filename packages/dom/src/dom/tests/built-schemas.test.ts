// @vitest-environment jsdom
//
// A declaration carrying the JSON forms a build wrote must render, hydrate and serve exactly what
// the same declaration renders through the compilers, under either text writer.
import { createExoSchema } from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoCursorDeclaration,
    TExoJsonDeclarations,
    TExoMachine,
    TExoMachineInitialState,
    TExoSchemaBuild,
    TExoSchemaCursor,
    TExoTextPort,
    TExoAttrPort,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoStrBackend, compileExoStrJsonDeclaration } from '@exodra/string';
import {
    ExoDomBackend,
    compileExoDomSchema,
    exoDomJsonDeclaration,
    withExoBuiltSchemas,
    withExoCompiler,
    withExoDefaults,
    withExoHydration,
} from '@exodra/dom';

const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let label!: TExoTextPort;
        let mark!: TExoAttrPort;
        b.el('li', null, (li) => {
            mark = li.port('data-row');
            label = li.textPort();
        });
        return { label, mark };
    },
    (P) =>
        (c: TExoChildrenWiring, params: unknown): void => {
            c.attr(P.mark, String(params));
            c.text(P.label, 'row ' + String(params));
        }
);

const listOf = (row: typeof ROW) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let title!: TExoTextPort;
            let rows!: TExoChildrenPort;
            b.el('section', { class: 'card' }, (s) => {
                s.el('h2', null, (h) => {
                    title = h.textPort();
                });
                s.el('ul', null, (ul) => {
                    ul.text('items:');
                    rows = ul.childrenPort();
                    ul.text(' end');
                });
            });
            return { title, rows };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.text(P.title, 'Title');
                c.list(P.rows, row, ['a', 'b']);
            }
    );

const LIST = listOf(ROW);

// The build's half: both compilers run, under the writer that declares no Text node.
function jsonOf(declaration: TExoCursorDeclaration): TExoJsonDeclarations {
    const neutral = withExoDefaults(withExoCompiler(new ExoDomBackend()));
    return JSON.parse(
        JSON.stringify({
            dom: exoDomJsonDeclaration(compileExoDomSchema(declaration, neutral)),
            string: compileExoStrJsonDeclaration(declaration),
        })
    ) as TExoJsonDeclarations;
}

function builtTwin<TWiring, TPorts>(
    machine: TExoMachine<TWiring, TPorts>
): TExoMachine<TWiring, TPorts> {
    const declaration = createExoSchema(
        machine.declaration.build as unknown as (cursor: TExoSchemaCursor) => void,
        undefined,
        jsonOf(machine.declaration)
    ) as unknown as TExoCursorDeclaration<TPorts>;
    return { ...machine, declaration, forms: [] };
}

const BUILT_ROW = builtTwin(ROW);
const BUILT_LIST = builtTwin(listOf(BUILT_ROW));

function renderedBy(
    backend: { render(machine: never, parent: Element): () => void },
    machine: TExoMachine<never>
): string {
    const parent = host();
    backend.render(machine as never, parent);
    return parent.innerHTML;
}

describe('a declaration that carries the JSON forms a build wrote', () => {
    it('renders with no compiler composed, the same markup the compiler path renders', () => {
        const compiled = renderedBy(withExoCompiler(new ExoDomBackend()), LIST as never);
        const built = renderedBy(withExoBuiltSchemas(new ExoDomBackend()), BUILT_LIST as never);
        expect(built).toBe(compiled);
        expect(built).toBe(
            '<section class="card"><h2>Title</h2><ul>items:<li data-row="a">row a</li>' +
                '<li data-row="b">row b</li><!----> end</ul></section>'
        );
    });

    it('keeps updating a translated text port under withExoDefaults, built or compiled alike', () => {
        for (const machine of [LIST, BUILT_LIST]) {
            const parent = host();
            const backend = withExoDefaults(withExoCompiler(new ExoDomBackend()));
            const node = backend.buildRoot(machine as never);
            backend.mountRoot(node, parent);
            const h2 = parent.querySelector('h2') as Element;
            const font = document.createElement('font');
            font.appendChild(document.createTextNode('Titre'));
            h2.replaceChild(font, h2.firstChild as Node);
            (node as unknown as { text(port: TExoTextPort, value: unknown): void }).text(
                LIST.declaration.ports.title,
                'New'
            );
            expect(h2.innerHTML).toBe('New');
        }
    });

    it('serves the same bytes from the JSON form as from the string compiler', () => {
        const str = new ExoStrBackend();
        expect(str.render(BUILT_LIST as never)).toBe(new ExoStrBackend().render(LIST as never));
    });

    it('hydrates the served page from the JSON form and adopts its rows', () => {
        const list = builtTwin(listOf(BUILT_ROW));
        const parent = host();
        parent.innerHTML = new ExoStrBackend().render(list as never);
        const served = Array.from(parent.querySelectorAll('li'));
        withExoHydration(withExoCompiler(new ExoDomBackend())).hydrate(list as never, parent);
        const now = Array.from(parent.querySelectorAll('li'));
        expect(now).toEqual(served);
        expect(now[0]).toBe(served[0]);
    });

    it('builds no schema from the markup: the build function never runs on the page', () => {
        let ran = 0;
        const counting = createExoSchema(
            ((cursor: TExoSchemaCursor) => {
                ran++;
                (LIST.declaration.build as unknown as (c: TExoSchemaCursor) => void)(cursor);
            }) as unknown as (cursor: TExoSchemaCursor) => void,
            undefined,
            jsonOf(LIST.declaration)
        );
        ran = 0;
        const machine = {
            ...BUILT_LIST,
            declaration: counting as unknown as typeof LIST.declaration,
            forms: [],
        };
        renderedBy(withExoBuiltSchemas(new ExoDomBackend()), machine as never);
        new ExoStrBackend().render(machine as never);
        expect(ran).toBe(0);
        expect(typeof (counting.build as TExoSchemaBuild)).toBe('function');
    });
});
