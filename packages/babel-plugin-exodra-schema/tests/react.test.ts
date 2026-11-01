// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import modulesCommonjs from '@babel/plugin-transform-modules-commonjs';
import * as core from '@exodra/core';
import * as compat from '@exodra/react-compat';
import * as jsxRuntime from '@exodra/react-compat/jsx-runtime';
import plugin from '../src/react/index';

const { act, createRoot } = compat;
const { jsx } = jsxRuntime;
const MODULES: Readonly<Record<string, unknown>> = {
    '@exodra/core': core,
    '@exodra/react-compat': compat,
    '@exodra/react-compat/jsx-runtime': jsxRuntime,
    react: compat,
    'react/jsx-runtime': jsxRuntime,
};

function compile(source: string): string {
    const res = babel.transformSync(source, {
        filename: 'input.jsx',
        babelrc: false,
        configFile: false,
        plugins: [syntaxJsx, [plugin as unknown as babel.PluginItem, {}]],
    });
    if (res?.code === undefined || res.code === null) throw new Error('compile produced no code');
    return res.code;
}

function load(source: string): Record<string, unknown> {
    const res = babel.transformSync(compile(source), {
        filename: 'compiled.js',
        babelrc: false,
        configFile: false,
        plugins: [modulesCommonjs],
    });
    const exports: Record<string, unknown> = {};
    new Function('require', 'exports', res?.code ?? '')((id: string) => MODULES[id], exports);
    return exports;
}

function mount(element: unknown): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    createRoot(host).render(element);
    return host;
}

const COUNTER = `
    import { useState } from '@exodra/react-compat';
    const items = [{ id: 'a', t: 'A' }, { id: 'b', t: 'B' }];
    function Badge({ n }) {
        return <em className="badge">{n}!</em>;
    }
    export function Counter({ label }) {
        const [n, setN] = useState(0);
        const [list] = useState(items);
        return (
            <div className="counter" title={label} style={{ color: 'red' }}>
                <span>{n}</span>
                <button onClick={() => setN(n + 1)} disabled={n > 3}>+</button>
                {n > 1 && <Badge n={n} />}
                <ul>{list.map((i) => <li key={i.id} data-x={i.id}>{i.t}</li>)}</ul>
            </div>
        );
    }
`;

describe('the React compiler turns host trees into schemas with ports', () => {
    it('hoists one schema per host tree and leaves components as jsx() calls', () => {
        const out = compile(COUNTER);
        expect(out.match(/createExoSchema\(/g)).toHaveLength(3);
        expect(out).toContain('_b1.port("title")');
        expect(out).toContain('_b2.eventPort("click")');
        expect(out).toContain('jsx(Badge, {');
        expect(out).not.toMatch(/<[a-z]/);
    });

    it('renders the compiled component and updates it in place', async () => {
        const { Counter } = load(COUNTER) as { Counter: unknown };
        const host = mount(jsx(Counter, { label: 'hi' }));
        const div = host.firstChild as HTMLElement;
        expect(div.outerHTML).toBe(
            '<div class="counter" title="hi" style="color: red;"><span>0</span>' +
                '<button>+</button><ul><li data-x="a">A</li><li data-x="b">B</li></ul></div>'
        );
        const button = host.querySelector('button') as HTMLButtonElement;
        const rows = Array.from(host.querySelectorAll('li'));
        await act(() => button.click());
        await act(() => button.click());
        expect(host.querySelector('span')?.textContent).toBe('2');
        expect(host.querySelector('em')?.textContent).toBe('2!');
        expect(host.firstChild).toBe(div);
        expect(Array.from(host.querySelectorAll('li'))).toEqual(rows);
    });

    it('keeps a nested component and its state when a ternary switches between two trees of the same root', async () => {
        const { Shell, bump } = load(`
            import { useState } from '@exodra/react-compat';
            let up;
            export const bump = () => up();
            function Counter() {
                const [n, setN] = useState(0);
                up = () => setN((v) => v + 1);
                return <b>{n}</b>;
            }
            export function Shell({ extra }) {
                return extra ? (
                    <div><i>t</i><Counter /><u>x</u></div>
                ) : (
                    <div><i>t</i><Counter /></div>
                );
            }
        `) as { Shell: unknown; bump: () => void };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        root.render(jsx(Shell, { extra: false }));
        await act(async () => bump());
        root.render(jsx(Shell, { extra: true }));
        expect(host.innerHTML).toBe('<div><i>t</i><b>1</b><u>x</u></div>');
    });

    it('keeps DOM nodes, typed text, state and one click handler when compiled branches flip back and forth', async () => {
        const { Shell, bump, clicks } = load(`
            import { useState } from '@exodra/react-compat';
            let up;
            export const clicks = [];
            export const bump = () => up();
            function Counter() {
                const [n, setN] = useState(0);
                up = () => setN((v) => v + 1);
                return <b>{n}</b>;
            }
            export function Shell({ extra, label }) {
                return extra ? (
                    <div className="x"><input defaultValue="start" /><button onClick={() => clicks.push(label)}>go</button><Counter /><u>tail</u></div>
                ) : (
                    <div className="y" title={label}><input defaultValue="start" /><button onClick={() => clicks.push(label)}>go</button><Counter /></div>
                );
            }
        `) as { Shell: unknown; bump: () => void; clicks: string[] };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        root.render(jsx(Shell, { extra: false, label: 'a' }));
        await act(async () => bump());
        const input = host.querySelector('input') as HTMLInputElement;
        const button = host.querySelector('button') as HTMLButtonElement;
        input.value = 'typed';
        root.render(jsx(Shell, { extra: true, label: 'b' }));
        expect(host.innerHTML).toBe(
            '<div class="x"><input><button>go</button><b>1</b><u>tail</u></div>'
        );
        expect(host.querySelector('input')).toBe(input);
        expect(input.value).toBe('typed');
        button.click();
        expect(clicks).toEqual(['b']);
        root.render(jsx(Shell, { extra: false, label: 'c' }));
        expect(host.innerHTML).toBe(
            '<div class="y" title="c"><input><button>go</button><b>1</b></div>'
        );
        button.click();
        expect(clicks).toEqual(['b', 'c']);
        await act(async () => bump());
        expect(host.querySelector('b')?.textContent).toBe('2');
    });

    it('keys a run of dynamic children and merged static text by their React positions', async () => {
        const { Shell, bump } = load(`
            import { useState } from '@exodra/react-compat';
            let up;
            export const bump = () => up();
            function Counter() {
                const [n, setN] = useState(0);
                up = () => setN((v) => v + 1);
                return <b>{n}</b>;
            }
            export function Shell({ more, note }) {
                return more ? (
                    <div>a{'b'}<Counter />{note}</div>
                ) : (
                    <div>a{'b'}<Counter /></div>
                );
            }
        `) as { Shell: unknown; bump: () => void };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        root.render(jsx(Shell, { more: false, note: 'n' }));
        await act(async () => bump());
        root.render(jsx(Shell, { more: true, note: 'n' }));
        expect(host.innerHTML).toBe('<div>ab<b>1</b>n</div>');
    });

    it('merges the two branches of a ternary with one root tag into one schema', async () => {
        const source = `
            export function Shell({ extra, label }) {
                return extra ? (
                    <div className="x"><i>t</i><u>{label}</u></div>
                ) : (
                    <div className="y"><i>t</i></div>
                );
            }
        `;
        expect(compile(source).match(/\.el\("div"/g)).toHaveLength(1);
        const { Shell } = load(source) as { Shell: unknown };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        root.render(jsx(Shell, { extra: false, label: 'a' }));
        const i = host.querySelector('i');
        expect(host.innerHTML).toBe('<div class="y"><i>t</i></div>');
        root.render(jsx(Shell, { extra: true, label: 'b' }));
        expect(host.innerHTML).toBe('<div class="x"><i>t</i><u>b</u></div>');
        expect(host.querySelector('i')).toBe(i);
    });

    it('compiles already-compiled jsx(), jsxs(), require()d runtime calls and React.createElement', async () => {
        const source = `
            import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
            import React, { useState } from 'react';
            const runtime = require('react/jsx-runtime');
            export function Card({ title, n }) {
                return _jsxs('article', {
                    className: 'card',
                    children: [
                        _jsx('h2', { children: title }),
                        (0, runtime.jsx)('p', { 'data-n': n, children: 'body' }),
                        React.createElement('i', { title: 't' }, 'x'),
                    ],
                });
            }
            export function Spread(props) {
                return _jsx('div', { ...props });
            }
        `;
        const out = compile(source);
        expect(out.match(/createExoSchema\(/g)).toHaveLength(1);
        expect(out).not.toMatch(/_jsxs\('article'|_jsx\('h2'|createElement\('i'/);
        expect(out).toMatch(/_jsx\(["']div["'], \{\s*\.\.\.props/);
        const { Card, Spread } = load(source) as { Card: unknown; Spread: unknown };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        root.render(jsx(Card, { title: 'A', n: 1 }));
        expect(host.innerHTML).toBe(
            '<article class="card"><h2>A</h2><p data-n="1">body</p><i title="t">x</i></article>'
        );
        const h2 = host.querySelector('h2');
        root.render(jsx(Card, { title: 'B', n: 2 }));
        expect(host.innerHTML).toBe(
            '<article class="card"><h2>B</h2><p data-n="2">body</p><i title="t">x</i></article>'
        );
        expect(host.querySelector('h2')).toBe(h2);
        root.render(jsx(Spread, { id: 's' }));
        expect(host.innerHTML).toBe('<div id="s"></div>');
    });

    it('inlines a const kids array spread into createElement, and leaves a reused one alone', async () => {
        const source = `
            import { createElement as rc } from 'react';
            export function Card({ open, tags }) {
                const kids = [
                    rc('h3', { key: 'h' }, 'title'),
                    open ? rc('p', { key: 'd' }, 'details') : null,
                    rc('ul', { key: 't' }, tags.map((t) => rc('li', { key: t }, t))),
                ];
                return rc('div', { className: 'card' }, ...kids);
            }
            export function Twice() {
                const kids = [rc('b', { key: 'b' }, 'x')];
                console.log(kids.length);
                return rc('div', null, ...kids);
            }
        `;
        const out = compile(source);
        expect(out.match(/const kids =/g)).toHaveLength(1);
        expect(out).toMatch(/\.\.\.kids/);
        const { Card } = load(source) as { Card: unknown };
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        root.render(jsx(Card, { open: false, tags: ['a', 'b'] }));
        expect(host.innerHTML).toBe(
            '<div class="card"><h3>title</h3><ul><li>a</li><li>b</li></ul></div>'
        );
        root.render(jsx(Card, { open: true, tags: ['b', 'a'] }));
        expect(host.innerHTML).toBe(
            '<div class="card"><h3>title</h3><p>details</p><ul><li>b</li><li>a</li></ul></div>'
        );
    });

    it('re-orders compiled keyed rows by moving their nodes', async () => {
        const mod = load(`
            import { useState } from '@exodra/react-compat';
            export const api = {};
            export function List() {
                const [rows, setRows] = useState(['a', 'b', 'c']);
                api.set = setRows;
                return <ul>{rows.map((r) => <li key={r} className={'row-' + r}>{r}</li>)}</ul>;
            }
        `);
        const host = mount(jsx(mod.List as never, {}));
        const before = Array.from(host.querySelectorAll('li'));
        await act(() => (mod.api as { set: (rows: string[]) => void }).set(['c', 'a', 'b']));
        const after = Array.from(host.querySelectorAll('li'));
        expect(after.map((li) => li.className)).toEqual(['row-c', 'row-a', 'row-b']);
        expect(after[0]).toBe(before[2]);
    });

    it('leaves a host with a spread to the runtime, and compiles its children', async () => {
        const out = compile(`const v = <div {...p}><b title={t}>x</b></div>;`);
        expect(out).toContain('jsx("div", {');
        expect(out).toContain('...p');
        expect(out).toContain('createExoSchema(');
    });

    it('compiles fragments and refs', async () => {
        const mod = load(`
            import { useRef, useLayoutEffect } from '@exodra/react-compat';
            export const seen = [];
            export function Pair() {
                const ref = useRef(null);
                useLayoutEffect(() => { seen.push(ref.current.tagName); }, []);
                return <><dt ref={ref}>k</dt><dd>v</dd></>;
            }
        `);
        const host = mount(jsx('dl', { children: jsx(mod.Pair as never, {}) }));
        expect(host.innerHTML).toBe('<dl><dt>k</dt><dd>v</dd></dl>');
        expect(mod.seen).toEqual(['DT']);
    });

    it('keeps a controlled input at its state', async () => {
        const mod = load(`
            import { useState } from '@exodra/react-compat';
            export function Upper() {
                const [value, setValue] = useState('AB');
                return <input value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} />;
            }
        `);
        const host = mount(jsx(mod.Upper as never, {}));
        const input = host.querySelector('input') as HTMLInputElement;
        expect(input.value).toBe('AB');
        input.value = 'abc';
        await act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
        await act(() => Promise.resolve());
        expect(input.value).toBe('ABC');
    });

    it('a compiled element reads as a tag element: type, props, cloneElement', () => {
        const mod = load(`
            import { Children, cloneElement } from '@exodra/react-compat';
            function Tabs({ children, active }) {
                return <nav>{Children.map(children, (child, i) =>
                    cloneElement(child, { className: child.props.className + (i === active ? ' on' : '') })
                )}</nav>;
            }
            export function App({ label }) {
                return <Tabs active={1}><a className="tab" href="#a">{label}</a><a className="tab" href="#b">B</a></Tabs>;
            }
            export const probe = <i className="x">{'y'}</i>;
        `);
        const probe = mod.probe as { type: unknown; props: Record<string, unknown> };
        expect(probe.type).toBe('i');
        expect(probe.props).toEqual({ className: 'x', children: 'y' });
        const host = mount(jsx(mod.App as never, { label: 'A' }));
        expect(host.innerHTML).toBe(
            '<nav><a class="tab" href="#a">A</a><a class="tab on" href="#b">B</a></nav>'
        );
    });

    it('cloneElement keeps the ref a compiled element was written with', () => {
        const mod = load(`
            import { cloneElement, createRef } from '@exodra/react-compat';
            export const box = createRef();
            function Wrap({ children }) {
                return <section>{cloneElement(children, { title: 't' })}</section>;
            }
            export function App() {
                return <Wrap><b ref={box}>x</b></Wrap>;
            }
        `);
        const host = mount(jsx(mod.App as never, {}));
        expect(host.innerHTML).toBe('<section><b title="t">x</b></section>');
        expect((mod.box as { current: unknown }).current).toBe(host.querySelector('b'));
    });
});
