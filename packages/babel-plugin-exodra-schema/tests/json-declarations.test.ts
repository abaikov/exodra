// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import * as core from '@exodra/core';
import type { TExoCursorDeclaration, TExoTextPort, TExoChildrenPort } from '@exodra/core';
import { ExoDomBackend, withExoBuiltSchemas, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import plugin from '../src/index';

function compile(src: string, opts: Record<string, unknown> = {}): string {
    const res = babel.transformSync(src, {
        filename: 'input.jsx',
        babelrc: false,
        configFile: false,
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as unknown as babel.PluginItem, opts],
        ],
    });
    if (res?.code === undefined || res.code === null) throw new Error('compile produced no code');
    return res.code;
}

const SOURCE = `
    import { exoJsx } from '@exodra/jsx';
    export const CARD = exoJsx(($) => (
        <section class="card">
            <h2>{$.title}</h2>
            <ul>items:<$.rows /> end</ul>
        </section>
    ));
`;

type TCardPorts = { readonly title: TExoTextPort; readonly rows: TExoChildrenPort };

// The module, evaluated with its one import supplied from the real package.
function declarationOf(code: string): TExoCursorDeclaration<TCardPorts> {
    const body = code
        .replace(/^import \{ createExoNamedSchema \} from "@exodra\/core";\n/m, '')
        .replace('export const CARD =', 'return');
    return new Function('createExoNamedSchema', body)(core.createExoNamedSchema);
}

function cardMachine(declaration: TExoCursorDeclaration<TCardPorts>) {
    return core.createExoMachine<TExoDomNode, unknown, object>(declaration, {
        createInitialState: (c) => {
            c.text(declaration.ports.title, 'Title');
            return {};
        },
    });
}

describe('exoJsx compiled at build time', () => {
    it('writes the DOM and string JSON forms onto the declaration', () => {
        const declaration = declarationOf(compile(SOURCE));
        const json = declaration.jsonDeclarations as { dom: { html: string }; string: object };
        expect(json.dom.html).toBe(
            '<section class="card"><h2></h2><ul>items:<!----> end</ul></section>'
        );
        expect(json.string).toBeDefined();
    });

    it('renders with no compiler on the page, the markup the compiler path renders', () => {
        const built = cardMachine(declarationOf(compile(SOURCE)));
        const plain = cardMachine(declarationOf(compile(SOURCE, { jsonDeclarations: false })));
        const a = document.createElement('div');
        const b = document.createElement('div');
        withExoBuiltSchemas(new ExoDomBackend()).render(built as never, a);
        withExoCompiler(new ExoDomBackend()).render(plain as never, b);
        expect(a.innerHTML).toBe(b.innerHTML);
        expect(new ExoStrBackend().render(built as never)).toBe(
            new ExoStrBackend().render(plain as never)
        );
    });

    it('emits the declaration alone when jsonDeclarations is false', () => {
        const declaration = declarationOf(compile(SOURCE, { jsonDeclarations: false }));
        expect(declaration.jsonDeclarations).toBeNull();
    });
});
