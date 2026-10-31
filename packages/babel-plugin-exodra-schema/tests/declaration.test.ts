// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import { createExoMachineBuilder, createExoNamedSchema } from '@exodra/core';
import type { TExoCursorDeclaration, TExoEventPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
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

const COUNTER = `
    import { exoJsx } from '@exodra/jsx';
    export const COUNTER = exoJsx(($) => (
        <div class="counter" data-n={$.n}>
            <span>{$.count}</span>
            <button type="button" onClick={$.increment} on:dblclick={$.reset}>+</button>
            <$.rows />
            <div ref={$.box} unsafeHtml={$.html} />
        </div>
    ));
`;

function evaluate(code: string): TExoCursorDeclaration<unknown> {
    const body = code
        .replace(/^import \{ createExoNamedSchema \} from "@exodra\/core";\n/, '')
        .replace(/^export const (\w+) = /m, 'return ');
    return new Function('createExoNamedSchema', body)(createExoNamedSchema);
}

describe('exoJsx compiles to a named schema declaration', () => {
    it('emits the cursor calls a hand-written declaration makes', () => {
        const out = compile(COUNTER);
        expect(out).toContain('import { createExoNamedSchema } from "@exodra/core";');
        expect(out).toContain('_b1.port("data-n", "n");');
        expect(out).toContain('_b2.textPort("count");');
        expect(out).toContain('_b2.eventPort("click", "increment");');
        expect(out).toContain('_b2.eventPort("dblclick", "reset");');
        expect(out).toContain('_b1.childrenPort("rows");');
        expect(out).toContain('_b2.refPort("box");');
        expect(out).toContain('_b2.childrenPort("html");');
        expect(out).toContain('export const COUNTER = _s0;');
    });

    it('emits no wire, no machine and no fill', () => {
        const out = compile(COUNTER);
        expect(out).not.toMatch(/createInitialState|EXO_NO_EFFECTS|_c\./);
    });

    it('drops the marker import once nothing names it', () => {
        expect(compile(COUNTER)).not.toContain('@exodra/jsx');
    });

    it('builds a schema whose ports carry the names written after $.', () => {
        const declaration = evaluate(compile(COUNTER));
        expect(Object.keys(declaration.ports as object).sort()).toEqual(
            ['box', 'count', 'html', 'increment', 'n', 'reset', 'rows'].sort()
        );
    });

    it('renders through the ordinary machine builder, which fills the named ports', () => {
        const declaration = evaluate(
            compile(`
                export const V = exoJsx(($) => (
                    <p class="count">
                        <b>{$.count}</b>
                        <button type="button" onClick={$.increment}>+</button>
                    </p>
                ));
            `)
        );
        const P = declaration.ports as { count: TExoTextPort; increment: TExoEventPort };
        const m = createExoMachineBuilder<TExoDomNode, unknown, { n: number }>(declaration);
        m.createInitialState((c) => {
            c.text(P.count, 0);
            return { n: 0 };
        });
        m.on(P.increment, (c) => {
            const state = c.state as { n: number };
            state.n++;
            c.text(P.count, state.n);
        });
        const parent = document.createElement('div');
        withExoCompiler(new ExoDomBackend()).render(m.done(), parent);
        expect(parent.innerHTML).toBe(
            '<p class="count"><b>0</b><button type="button">+</button></p>'
        );
        (parent.querySelector('button') as HTMLButtonElement).click();
        expect(parent.querySelector('b')?.textContent).toBe('1');
    });

    it('takes a declaration with no ports and no parameter', () => {
        const out = compile(`export const S = exoJsx(() => <hr class="rule" />);`);
        expect(out).toContain('_b0.el("hr", {\n    class: "rule"\n  });');
    });

    it('imports the factory under the name schemaImport gives it, from schemaSource', () => {
        const out = compile(COUNTER, { schemaSource: 'my-core', schemaImport: 'declare' });
        expect(out).toContain('import { declare } from "my-core";');
        expect(out).toContain('const _s0 = declare(');
    });

    it('compiles away whatever call markerName names, and leaves the default name alone', () => {
        const out = compile(
            `
                const A = mark(($) => <li>{$.t}</li>);
                const untouched = exoJsx;
            `,
            { markerName: 'mark' }
        );
        expect(out).toContain('_b1.textPort("t");');
        expect(out).toContain('const untouched = exoJsx;');
    });

    it('follows an import alias of the marker', () => {
        const out = compile(`
            import { exoJsx as view } from '@exodra/jsx';
            const A = view(($) => <li>{$.t}</li>);
        `);
        expect(out).toContain('_b1.textPort("t");');
    });

    it('keeps the holder name the author chose', () => {
        const out = compile(`const A = exoJsx((port) => <li title={port.label} />);`);
        expect(out).toContain('_b1.port("title", "label");');
    });

    it('reads a bracketed port name, for one that is not an identifier', () => {
        const out = compile(`const A = exoJsx(($) => <li title={$['row-label']} />);`);
        expect(out).toContain('_b1.port("title", "row-label");');
    });

    it('folds every literal attribute into the markup', () => {
        const out = compile(
            `const A = exoJsx(() => <input type="checkbox" tabindex={0} checked disabled={false} />);`
        );
        expect(out).toContain('type: "checkbox"');
        expect(out).toContain('tabindex: 0');
        expect(out).toContain('checked: true');
        expect(out).toContain('disabled: false');
    });
});
