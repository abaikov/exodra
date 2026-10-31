import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import plugin from '../src/index';

function compile(src: string): string {
    const res = babel.transformSync(src, {
        filename: 'input.jsx',
        babelrc: false,
        configFile: false,
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as unknown as babel.PluginItem, {}],
        ],
    });
    if (res?.code === undefined || res.code === null) throw new Error('compile produced no code');
    return res.code;
}

describe('a declaration holds markup and named ports, and nothing else', () => {
    it('refuses an attribute expression that is not a port', () => {
        expect(() => compile(`const V = exoJsx(($) => <li title={item.title} />);`)).toThrow(
            /title=\{…\} on <li> is an expression/
        );
    });

    it('refuses a child expression that is not a port', () => {
        expect(() => compile(`const V = exoJsx(($) => <li>{item.title}</li>);`)).toThrow(
            /\{…\} inside <li> is an expression/
        );
    });

    it('refuses a closure where an event port belongs', () => {
        expect(() => compile(`const V = exoJsx(($) => <li onClick={() => go()} />);`)).toThrow(
            /onClick on <li> takes a port — write onClick=\{\$\.name\}/
        );
        expect(() => compile(`const V = exoJsx(($) => <li on:click={go} />);`)).toThrow(
            /on:click on <li> takes a port/
        );
    });

    it('refuses an inline HTML handler and names both event-port forms', () => {
        expect(() => compile(`const V = exoJsx(($) => <li onclick="go()" />);`)).toThrow(
            /"onclick" on <li> is an inline HTML handler.*onClick=\{\$\.name\}, or on:click=\{\$\.name\}/
        );
    });

    it('refuses a namespace other than on:', () => {
        expect(() => compile(`const V = exoJsx(($) => <li set:title={$.t} />);`)).toThrow(
            /"set:title" on <li> — the one namespace is on:/
        );
    });

    it('refuses a spread', () => {
        expect(() => compile(`const V = exoJsx(($) => <li {...rest} />);`)).toThrow(
            /\{\.\.\.spread\} on <li>/
        );
    });

    it('refuses a component tag and points at the children port', () => {
        expect(() => compile(`const V = exoJsx(($) => <ul><Row /></ul>);`)).toThrow(
            /<Row> is not an element, and a declaration has no components.*<\$\.rows \/>/
        );
        expect(() => compile(`const V = exoJsx(($) => <ul><ui.Row /></ul>);`)).toThrow(
            /<ui\.Row> is not an element/
        );
    });

    it('refuses attributes or children on a children port', () => {
        expect(() => compile(`const V = exoJsx(($) => <ul><$.rows list={3} /></ul>);`)).toThrow(
            /<\$\.rows \/> is a children port and takes no attributes/
        );
        expect(() => compile(`const V = exoJsx(($) => <ul><$.rows>x</$.rows></ul>);`)).toThrow(
            /<\$\.rows \/> is a children port and takes no children/
        );
    });

    it('refuses a text port beside other children', () => {
        expect(() => compile(`const V = exoJsx(($) => <li>Hi, {$.name}</li>);`)).toThrow(
            /\{\$\.name\} inside <li> stands beside other children.*<span>\{\$\.name\}<\/span>/
        );
    });

    it('refuses unsafeHtml beside children, and unsafeHtml that is not a port', () => {
        expect(() =>
            compile(`const V = exoJsx(($) => <div unsafeHtml={$.html}>x</div>);`)
        ).toThrow(/has unsafeHtml=\{…\} and children/);
        expect(() => compile(`const V = exoJsx(($) => <div unsafeHtml="<b>x</b>" />);`)).toThrow(
            /unsafeHtml on <div> takes a port/
        );
    });

    it('refuses a port name used twice', () => {
        expect(() =>
            compile(`const V = exoJsx(($) => <li title={$.t}><b>{$.t}</b></li>);`)
        ).toThrow(/the port "t" is declared twice/);
    });

    it('refuses a fragment, at the root and inside', () => {
        expect(() => compile(`const V = exoJsx(($) => <><li /></>);`)).toThrow(
            /returns ONE element and does nothing else/
        );
        expect(() => compile(`const V = exoJsx(($) => <ul><><li /></></ul>);`)).toThrow(
            /a fragment has no place in a declaration/
        );
    });

    it('refuses work before the return', () => {
        expect(() =>
            compile(`const V = exoJsx(($) => { const x = 1; return <li />; });`)
        ).toThrow(/returns ONE element and does nothing else/);
    });

    it('refuses a destructured or second parameter', () => {
        expect(() => compile(`const V = exoJsx(({ t }) => <li />);`)).toThrow(
            /takes ONE plain parameter/
        );
        expect(() => compile(`const V = exoJsx(($, i) => <li />);`)).toThrow(
            /takes ONE plain parameter/
        );
    });

    it('refuses a reference where the function literal belongs', () => {
        expect(() => compile(`const V = exoJsx(build);`)).toThrow(
            /takes exactly one function literal/
        );
    });

    it('refuses JSX outside exoJsx()', () => {
        expect(() => compile(`const V = <li />;`)).toThrow(/JSX outside exoJsx\(\)/);
    });
});
