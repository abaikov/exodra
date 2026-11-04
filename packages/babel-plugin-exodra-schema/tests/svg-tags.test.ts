// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import { createExoMachine, createExoNamedSchema } from '@exodra/core';
import type { TExoCursorDeclaration } from '@exodra/core';
import { ExoDomBackend, withExoCompiler, withExoForeignNamespaces } from '@exodra/dom';
import plugin from '../src/index';

const SVG_NS = 'http://www.w3.org/2000/svg';

function declare(src: string): TExoCursorDeclaration<unknown> {
    const res = babel.transformSync(src, {
        filename: 'input.jsx',
        babelrc: false,
        configFile: false,
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as unknown as babel.PluginItem, {}],
        ],
    });
    const body = (res?.code ?? '')
        .replace(/^import \{ createExoNamedSchema \} from "@exodra\/core";\n/, '')
        .replace(/^const S = /m, 'return ');
    return new Function('createExoNamedSchema', body)(createExoNamedSchema);
}

describe('SVG tags in a declaration', () => {
    it('render in the SVG namespace with their camelCase names', () => {
        const schema = declare(`
            const S = exoJsx(() => (
                <svg viewBox="0 0 10 10">
                    <defs>
                        <linearGradient id="g"><stop offset="0" /></linearGradient>
                        <clipPath id="c"><rect width="1" height="1" /></clipPath>
                        <filter id="f"><feDropShadow dx="1" /><feGaussianBlur stdDeviation="1" /></filter>
                    </defs>
                    <path id="p" d="M0 0L9 9" />
                    <circle r="1"><animateMotion dur="1s"><mpath href="#p" /></animateMotion></circle>
                    <text x="1"><tspan>t</tspan></text>
                </svg>
            ));
        `);
        const root = document.createElement('div');
        withExoForeignNamespaces(withExoCompiler(new ExoDomBackend())).render(
            createExoMachine<never, unknown>(schema, { createInitialState: () => ({}) }) as never,
            root
        );
        const names = Array.from(root.querySelectorAll('*')).map((el) => [
            el.namespaceURI,
            el.localName,
        ]);
        for (const [ns] of names) expect(ns).toBe(SVG_NS);
        expect(names.map(([, name]) => name)).toEqual([
            'svg',
            'defs',
            'linearGradient',
            'stop',
            'clipPath',
            'rect',
            'filter',
            'feDropShadow',
            'feGaussianBlur',
            'path',
            'circle',
            'animateMotion',
            'mpath',
            'text',
            'tspan',
        ]);
        expect(root.querySelector('mpath')?.getAttribute('href')).toBe('#p');
    });
});
