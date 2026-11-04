// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import presetTypescript from '@babel/preset-typescript';
import transformCommonjs from '@babel/plugin-transform-modules-commonjs';
import { transform } from 'sucrase';
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as exodraCore from '@exodra/core';
import * as exodraListReconcile from '@exodra/list-reconcile';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import schemaPlugin from '../../../babel-plugin-exodra-schema/src/index';
import { translateExoToReact } from '../translateExoToReact';
import { COUNTER_SOURCE, FIXED_SOURCE, LIST_SOURCE, STYLED_SOURCE } from './fixtures';

type TModule = Record<string, unknown>;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function run(code: string, modules: Record<string, TModule>): TModule {
    const exports: TModule = {};
    const require = (name: string): TModule => {
        const found = modules[name];
        if (found === undefined) throw new Error(`no module ${name}`);
        return found;
    };
    new Function('require', 'exports', code)(require, exports);
    return exports;
}

function runExodra(source: string): TModule {
    const out = babel.transformSync(source, {
        filename: 'input.tsx',
        babelrc: false,
        configFile: false,
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [schemaPlugin as unknown as babel.PluginItem, {}],
            transformCommonjs,
        ],
        presets: [[presetTypescript, { isTSX: true, allExtensions: true }]],
    });
    return run(out?.code ?? '', {
        '@exodra/core': exodraCore,
        '@exodra/list-reconcile': exodraListReconcile,
    });
}

function compileReact(code: string): string {
    return transform(code, {
        transforms: ['typescript', 'jsx', 'imports'],
        jsxRuntime: 'automatic',
        production: true,
    }).code;
}

function runReact(source: string): TModule {
    const translation = translateExoToReact(source);
    expect(translation.unsupported).toEqual([]);
    const modules: Record<string, TModule> = { react: React, 'react/jsx-runtime': ReactJsxRuntime };
    if (translation.runtime !== null) {
        modules['./exo-react-runtime'] = run(compileReact(translation.runtime), modules);
    }
    return run(compileReact(translation.code), modules);
}

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
});

function mountBoth(source: string, name: string): { exodra: HTMLElement; react: HTMLElement } {
    const exodra = document.createElement('div');
    const react = document.createElement('div');
    document.body.append(exodra, react);
    const dispose = backend.render(runExodra(source)[name] as never, exodra);
    const root = createRoot(react);
    act(() => root.render(React.createElement(runReact(source)[name] as React.FC)));
    cleanups.push(() => {
        dispose();
        act(() => root.unmount());
        exodra.remove();
        react.remove();
    });
    return { exodra, react };
}

function clickBoth(sides: { exodra: HTMLElement; react: HTMLElement }, selector: string): void {
    (sides.exodra.querySelector(selector) as HTMLElement).click();
    act(() => (sides.react.querySelector(selector) as HTMLElement).click());
}

describe('translateExoToReact', () => {
    it('a counter renders the same DOM and reacts to clicks the same way', () => {
        const sides = mountBoth(COUNTER_SOURCE, 'COUNTER');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        for (let i = 0; i < 4; i++) {
            clickBoth(sides, 'button');
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelector('b')?.textContent).toBe('4');
        expect(sides.react.querySelector('.counter')?.getAttribute('data-tone')).toBe('loud');
    });

    it('a reconciled list with built rows and a row re-wire matches after every step', () => {
        const sides = mountBoth(LIST_SOURCE, 'LIST');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        for (const selector of ['.add', '.add', '.reverse', '.finish', '.reverse', '.add']) {
            clickBoth(sides, selector);
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelectorAll('li')).toHaveLength(5);
    });

    it('keeps a row element across a reorder, like the Exodra list does', () => {
        const sides = mountBoth(LIST_SOURCE, 'LIST');
        const first = sides.react.querySelector('li');
        clickBoth(sides, '.reverse');
        expect(sides.react.querySelectorAll('li')[1]).toBe(first);
    });

    it('a fixed list and a single child built from params render the same DOM', () => {
        const sides = mountBoth(FIXED_SOURCE, 'FIXED');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelectorAll('.rows li')).toHaveLength(3);
        expect(sides.react.querySelector('.head li')?.textContent).toBe('head');
    });

    it('a style made of a module const reaches React as a style object', () => {
        const sides = mountBoth(STYLED_SOURCE, 'STYLED');
        const exodra = sides.exodra.querySelector('.styled') as HTMLElement;
        const react = sides.react.querySelector('.styled') as HTMLElement;
        for (const name of ['padding', 'color', 'borderRadius'] as const) {
            expect(react.style[name]).toBe(exodra.style[name]);
        }
        expect(react.style.color).toBe('red');
        expect(react.title).toBe('color: red; border-radius: 8px');
        expect((sides.react.querySelector('b') as HTMLElement).style.margin).toBe('1px');
    });

    const HANDLERS_STEP =
        '    (m) => {\n        const { show } = m.transitions;\n        return withExoHandlers(';
    const UNSUPPORTED_SOURCES: readonly { what: string; source: string; unsupported: string }[] = [
        {
            what: 'names a composeExoMachine step that is not one decorator call',
            source: COUNTER_SOURCE.replace(
                HANDLERS_STEP,
                '    (m) => ({ ...m, createInitialState: (c) => ({ n: 1 }) }),\n' + HANDLERS_STEP
            ),
            unsupported: 'COUNTER: a composeExoMachine step is not one decorator call',
        },
        {
            what: 'names what it cannot translate instead of emitting wrong code',
            source: `${COUNTER_SOURCE}const COMPACT = COUNTER.overrides({});\n`,
            unsupported: 'COUNTER.overrides(…) has no React form',
        },
        {
            what: 'refuses a second wire, as withExoWire does',
            source: LIST_SOURCE.replace(
                HANDLERS_STEP,
                '    (m) => withExoWire(m, (c) => c),\n' + HANDLERS_STEP
            ),
            unsupported: 'LIST: withExoWire(…) is applied twice; a machine has one wire',
        },
        {
            what: 'names an effect handle kept in a variable',
            source: COUNTER_SOURCE.replace(
                HANDLERS_STEP,
                '    (m) =>\n        withExoEffects(m, (effect) => {\n            const ticking = effect((c) => null);\n        }),\n' +
                    HANDLERS_STEP
            ),
            unsupported: 'COUNTER: an effect handle kept in a variable has no React form',
        },
    ];

    for (const c of UNSUPPORTED_SOURCES) {
        it(c.what, () => {
            expect(translateExoToReact(c.source).unsupported).toEqual([c.unsupported]);
        });
    }
});
