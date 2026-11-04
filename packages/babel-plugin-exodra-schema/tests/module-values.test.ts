// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import presetTypescript from '@babel/preset-typescript';
import transformCommonjs from '@babel/plugin-transform-modules-commonjs';
import * as exodraCore from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import plugin from '../src/index';

function compile(
    src: string,
    options: Record<string, unknown> = { jsonDeclarations: false }
): string {
    const res = babel.transformSync(src, {
        filename: 'input.jsx',
        babelrc: false,
        configFile: false,
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as unknown as babel.PluginItem, options],
        ],
    });
    if (res?.code === undefined || res.code === null) throw new Error('compile produced no code');
    return res.code;
}

function load(src: string, modules: Record<string, unknown>): Record<string, unknown> {
    const out = babel.transformSync(src, {
        filename: 'input.tsx',
        babelrc: false,
        configFile: false,
        plugins: [[plugin as unknown as babel.PluginItem, {}], transformCommonjs],
        presets: [[presetTypescript, { isTSX: true, allExtensions: true }]],
    });
    const exports: Record<string, unknown> = {};
    const require = (name: string): unknown => {
        if (!(name in modules)) throw new Error(`no module ${name}`);
        return modules[name];
    };
    new Function('require', 'exports', out?.code ?? '')(require, exports);
    return exports;
}

describe('an import or a module const in an attribute is read when the schema compiles', () => {
    it('renders a CSS Modules class and a theme token through TypeScript import elision', () => {
        const page = load(
            `
            import styles from './Row.module.css';
            import { PANEL } from '../theme';
            import { exoJsx } from '@exodra/jsx';
            import { createExoMachine } from '@exodra/core';
            const THEME = { gap: 'gap:4px' };
            const ROW_SCHEMA = exoJsx(() => (
                <li class={styles['row-active']} style={PANEL} title={THEME.gap}>x</li>
            ));
            export const ROW = createExoMachine<never, unknown>(ROW_SCHEMA, { createInitialState: () => ({}) });
        `,
            {
                './Row.module.css': {
                    default: { 'row-active': 'Row_active_x1' },
                    __esModule: true,
                },
                '../theme': { PANEL: 'color:red' },
                '@exodra/core': exodraCore,
            }
        );
        const root = document.createElement('div');
        withExoCompiler(new ExoDomBackend()).render(page.ROW as never, root);
        expect(root.innerHTML).toBe(
            '<li class="Row_active_x1" style="color:red" title="gap:4px">x</li>'
        );
    });

    it('puts the expression itself into the element statics', () => {
        const out = compile(`
            import * as styles from './Row.module.css';
            const S = exoJsx(($) => <li class={styles.row}>{$.title}</li>);
        `);
        expect(out).toContain('class: styles.row');
    });

    it('gives such a declaration no build-time forms, and keeps them for the others', () => {
        const out = compile(
            `
            import { PANEL } from '../theme';
            const A = exoJsx(($) => <li style={PANEL} />);
            const B = exoJsx(($) => <li style="color:red" />);
        `,
            {}
        );
        const [first, second] = out.split('createExoNamedSchema(').slice(1);
        expect(first).not.toContain('undefined, {');
        expect(second).toContain('undefined, {');
    });
});

describe('what module scope would not see stays refused', () => {
    const refused =
        /style=\{…\} on <li> is an expression.*a let, a local value or a call is neither/;

    it.each([
        ['a let', `let THEME = { a: 'x' }; const S = exoJsx(($) => <li style={THEME.a} />);`],
        [
            'a const declared after',
            `const S = exoJsx(($) => <li style={THEME.a} />); const THEME = { a: 'x' };`,
        ],
        ['a call', `import { tone } from './t'; const S = exoJsx(($) => <li style={tone()} />);`],
        [
            'a computed non-literal member',
            `import styles from './s'; let k = 'a'; const S = exoJsx(($) => <li style={styles[k]} />);`,
        ],
        ['an unbound name', `const S = exoJsx(($) => <li style={item.id} />);`],
        [
            'a function-local value',
            `function f(styles) { return exoJsx(($) => <li style={styles.row} />); }`,
        ],
        [
            'a local const shadowing an import',
            `import { PANEL } from './t'; function f() { const PANEL = 'l'; return exoJsx(($) => <li style={PANEL} />); }`,
        ],
    ])('refuses %s', (_what, source) => {
        expect(() => compile(source)).toThrow(refused);
    });

    it('does not read a child from module scope', () => {
        expect(() =>
            compile(`import { T } from './t'; const S = exoJsx(($) => <li>{T}</li>);`)
        ).toThrow(/\{…\} inside <li> is an expression/);
    });
});
