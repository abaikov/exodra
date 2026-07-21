// @vitest-environment jsdom
//
// These tests guarantee the scaffolding generators emit REAL, working Exodra
// code — not just plausible-looking strings. Each generated module is compiled
// (ESM -> CJS) and executed against the real @exodra/core + @exodra/dom, then
// mounted into a jsdom document and asserted on. If a generator ever regresses
// to flat props, the wrong import, or a string-as-child, mounting throws or the
// DOM assertions fail.

import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import * as exodraCore from '@exodra/core';
import * as exodraDom from '@exodra/dom';
import {
    generateComponentFile,
    generatePageFile,
    generateApiFile,
} from './generators';

const { h } = exodraCore as typeof import('@exodra/core');
const { mount } = exodraDom as typeof import('@exodra/dom');

// Compile a generated ESM/TS source string and execute it with a require shim
// pointing at the real Exodra packages, returning its module exports.
function evalModule(source: string): Record<string, unknown> {
    const result = transformSync(source, {
        filename: 'generated.ts',
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
        babelrc: false,
        configFile: false,
    });
    if (!result?.code) throw new Error('Failed to compile generated source');

    const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
    const requireShim = (id: string): unknown => {
        if (id === '@exodra/core') return exodraCore;
        if (id === '@exodra/dom') return exodraDom;
        throw new Error(`Generated code required an unexpected module: ${id}`);
    };
    const fn = new Function('require', 'module', 'exports', result.code);
    fn(requireShim, moduleObj, moduleObj.exports);
    return moduleObj.exports;
}

function freshContainer(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

describe('component generator', () => {
    const source = generateComponentFile('Button', 'button');

    it('imports h from @exodra/core, not @exodra/jsx, and uses typed buckets', () => {
        expect(source).toContain("from '@exodra/core'");
        expect(source).not.toContain('@exodra/jsx');
        expect(source).toContain('defineComponent(');
        expect(source).toContain('static:');
        expect(source).toContain('text(');
        // The old broken generator passed flat props + props.children.
        expect(source).not.toContain('props.children');
        expect(source).not.toMatch(/h\('div',\s*\{\s*class:/);
    });

    it('compiles and mounts to real DOM', () => {
        const mod = evalModule(source);
        const Button = mod.Button as Parameters<typeof h>[0];
        const container = freshContainer();

        const { dispose } = mount(h(Button, { static: {} }), container);

        const root = container.querySelector('.button');
        expect(root).not.toBeNull();
        expect(root?.tagName.toLowerCase()).toBe('div');
        expect(root?.textContent).toBe('Button');

        dispose();
    });
});

describe('page generator', () => {
    const source = generatePageFile('Home');

    it('imports h from @exodra/core and avoids @exodra/jsx', () => {
        expect(source).toContain("from '@exodra/core'");
        expect(source).not.toContain('@exodra/jsx');
        expect(source).toContain('export default function HomePage');
        expect(source).toContain('static:');
    });

    it('compiles and mounts, rendering heading + copy', () => {
        const mod = evalModule(source);
        const HomePage = mod.default as () => ReturnType<typeof h>;
        const container = freshContainer();

        const { dispose } = mount(HomePage(), container);

        const page = container.querySelector('.page');
        expect(page).not.toBeNull();
        expect(page?.querySelector('h1')?.textContent).toBe('Home');
        expect(page?.querySelector('p')?.textContent).toContain(
            'Welcome to the Home page.'
        );

        dispose();
    });
});

describe('api generator', () => {
    const source = generateApiFile('users');

    it('emits GET and POST handlers', () => {
        expect(source).toContain('export async function GET');
        expect(source).toContain('export async function POST');
        expect(source).toContain('API route users');
    });

    it('compiles to a module exporting both handlers', () => {
        const mod = evalModule(source);
        expect(typeof mod.GET).toBe('function');
        expect(typeof mod.POST).toBe('function');
    });
});
