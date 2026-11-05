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
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import schemaPlugin from '../../../babel-plugin-exodra-schema/src/index';
import { translateExoToReact } from '../translateExoToReact';
import {
    CHILDREN_SOURCE,
    COUNTER_SOURCE,
    FIELD_SOURCE,
    FIXED_SOURCE,
    FOREIGN_SOURCE,
    HELPER_SOURCE,
    KEYED_SOURCE,
    LIST_SOURCE,
    RECONCILER_SOURCE,
    STYLED_SOURCE,
} from './fixtures';

type TModule = Record<string, unknown>;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type TPillNode = {
    attr(port: string, value: unknown): void;
    text(port: string, value: unknown): void;
};

const SHARED_MODULES: Record<string, TModule> = {
    './pill': {
        showPill: (c: TPillNode, ports: { tone: string; label: string }, status: string) => {
            c.attr(ports.tone, status);
            c.text(ports.label, status);
        },
    },
    foreign: {
        withPings: (
            machine: exodraCore.TExoMachine<TPillNode, unknown, unknown, { pings: number }>,
            ping: exodraCore.TExoEventPort,
            said: string,
            seen: string
        ) =>
            exodraCore.withExoEffects(
                exodraCore.withExoHandlers(machine, (on) =>
                    on(ping, (c) => {
                        c.state.pings++;
                        c.text(said, 'ping ' + c.state.pings);
                    })
                ),
                (effect) => {
                    effect((c) => {
                        c.text(seen, 'seen ' + SERVICES.greeting);
                        return null;
                    });
                }
            ),
    },
};

const SERVICES = { greeting: 'hi' };

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
        ...SHARED_MODULES,
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
    const modules: Record<string, TModule> = {
        ...SHARED_MODULES,
        react: React,
        'react/jsx-runtime': ReactJsxRuntime,
    };
    if (translation.runtime !== null) {
        modules['./exo-react-runtime'] = run(compileReact(translation.runtime), modules);
    }
    const translated = run(compileReact(translation.code), modules);
    translated[RUNTIME_KEY] = modules['./exo-react-runtime'];
    return translated;
}

const RUNTIME_KEY = '__runtime';

const PARAMS_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers, withExoParamsEffects, withExoWire, wireExoNode } from '@exodra/core';
import type { TExoChildrenPort, TExoEventPort, TExoTextPort } from '@exodra/core';

type TSlotParams = { slot: string; title: string };

const SLOT_SCHEMA = exoJsx<{ title: TExoTextPort; started: TExoTextPort }>(($) => (
    <p><b>{$.title}</b><i>{$.started}</i></p>
));
const S = SLOT_SCHEMA.ports;
const SLOT = composeExoMachine(
    createExoMachine<never, TSlotParams, { starts: number }>(SLOT_SCHEMA, {
        createInitialState: () => ({ starts: 0 }),
    }),
    (m) =>
        withExoParamsEffects(m, {
            watchSlot: {
                key: (params: TSlotParams) => params.slot,
                start: (c, params: TSlotParams) => {
                    c.state.starts++;
                    c.text(S.started, params.slot + ' ' + c.state.starts);
                    return null;
                },
            },
        }),
    (m) => withExoWire(m, (c, params) => c.text(S.title, params.title))
);

const PAGE_SCHEMA = exoJsx<{ slot: TExoChildrenPort; retitle: TExoEventPort; move: TExoEventPort }>(($) => (
    <div>
        <$.slot />
        <button class="retitle" onClick={$.retitle}>retitle</button>
        <button class="move" onClick={$.move}>move</button>
    </div>
));
const G = PAGE_SCHEMA.ports;
export const PAGE = composeExoMachine(
    createExoMachine<never, unknown, { child: never }>(PAGE_SCHEMA, {
        createInitialState: (c) => ({ child: c.one(G.slot, SLOT, { slot: 'a', title: 'one' }) }),
    }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(G.retitle, (c) => wireExoNode(c.state.child, { slot: 'a', title: 'two' }));
            on(G.move, (c) => wireExoNode(c.state.child, { slot: 'b', title: 'three' }));
        })
);
`;

const backend = exodraCore.composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
    greeting: () => SERVICES.greeting,
});
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
});

function mountBoth(
    source: string,
    name: string,
    component: string
): { exodra: HTMLElement; react: HTMLElement } {
    const exodra = document.createElement('div');
    const react = document.createElement('div');
    document.body.append(exodra, react);
    const dispose = backend.render(runExodra(source)[name] as never, exodra);
    const root = createRoot(react);
    const translated = runReact(source);
    const runtime = translated[RUNTIME_KEY] as {
        ExoReactServices: React.FC<{ value: object; children?: React.ReactNode }>;
    };
    act(() =>
        root.render(
            React.createElement(
                runtime.ExoReactServices,
                { value: SERVICES },
                React.createElement(translated[component] as React.FC)
            )
        )
    );
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
        const sides = mountBoth(COUNTER_SOURCE, 'COUNTER', 'Counter');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        for (let i = 0; i < 4; i++) {
            clickBoth(sides, 'button');
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelector('b')?.textContent).toBe('4');
        expect(sides.react.querySelector('.counter')?.getAttribute('data-tone')).toBe('loud');
    });

    it('a transition named like a port setter keeps both, and the DOM still matches', () => {
        const source = COUNTER_SOURCE.replace(/\bshow\b/g, 'setCount');
        expect(() => translateExoToReact(source)).not.toThrow();
        const sides = mountBoth(source, 'COUNTER', 'Counter');
        for (let i = 0; i < 3; i++) {
            clickBoth(sides, 'button');
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelector('.counter')?.getAttribute('data-tone')).toBe('loud');
    });

    it('a reconciled list with built rows and a row re-wire matches after every step', () => {
        const sides = mountBoth(LIST_SOURCE, 'LIST', 'List');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        for (const selector of ['.add', '.add', '.reverse', '.finish', '.reverse', '.add']) {
            clickBoth(sides, selector);
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelectorAll('li')).toHaveLength(5);
    });

    it('keeps a row element across a reorder, like the Exodra list does', () => {
        const sides = mountBoth(LIST_SOURCE, 'LIST', 'List');
        const first = sides.react.querySelector('li');
        clickBoth(sides, '.reverse');
        expect(sides.react.querySelectorAll('li')[1]).toBe(first);
    });

    it('a fixed list and a single child built from params render the same DOM', () => {
        const sides = mountBoth(FIXED_SOURCE, 'FIXED', 'Fixed');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelectorAll('.rows li')).toHaveLength(3);
        expect(sides.react.querySelector('.head li')?.textContent).toBe('head');
    });

    it('a style made of a module const reaches React as a style object', () => {
        const sides = mountBoth(STYLED_SOURCE, 'STYLED', 'Styled');
        const exodra = sides.exodra.querySelector('.styled') as HTMLElement;
        const react = sides.react.querySelector('.styled') as HTMLElement;
        for (const name of ['padding', 'color', 'borderRadius'] as const) {
            expect(react.style[name]).toBe(exodra.style[name]);
        }
        expect(react.style.color).toBe('red');
        expect(react.title).toBe('color: red; border-radius: 8px');
        expect((sides.react.querySelector('b') as HTMLElement).style.margin).toBe('1px');
    });

    it('a connector handed to a helper of another module writes the same DOM', () => {
        const sides = mountBoth(HELPER_SOURCE, 'PILL', 'Pill');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        for (let i = 0; i < 3; i++) {
            clickBoth(sides, 'button');
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelector('.pill')?.getAttribute('data-tone')).toBe('hot');
    });

    it('a keyed list keeps rows, calls update on a changed item and reads a backend service', () => {
        const sides = mountBoth(KEYED_SOURCE, 'KEYED', 'Keyed');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        const b = sides.react.querySelectorAll('li')[1];
        for (const selector of ['.swap', '.rename', '.drop', '.swap']) {
            clickBoth(sides, selector);
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelectorAll('li')[1]).toBe(b);
        expect(b.textContent).toBe('hi Bee');
    });

    it('a decorator from another library, built on the real withExoHandlers and withExoEffects, runs', () => {
        const sides = mountBoth(FOREIGN_SOURCE, 'PING', 'Ping');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        clickBoth(sides, 'button');
        clickBoth(sides, 'button');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelector('i')?.textContent).toBe('ping 2');
        expect(sides.react.querySelector('em')?.textContent).toBe('seen hi');
    });

    it('portNode reads the element and a value port writes the property, as Exodra does', () => {
        const sides = mountBoth(FIELD_SOURCE, 'FIELD', 'Field');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        for (const side of [sides.exodra, sides.react]) {
            const input = side.querySelector('input') as HTMLInputElement;
            input.value = 'typed';
            act(() => {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            });
        }
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelector('output')?.textContent).toBe('typed');
        expect((sides.react.querySelector('input') as HTMLInputElement).value).toBe('');
        expect((sides.exodra.querySelector('input') as HTMLInputElement).value).toBe('');
    });

    it('a params effect restarts only when its key changes, beside a wire declared after it', () => {
        const sides = mountBoth(PARAMS_SOURCE, 'PAGE', 'Page');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelector('i')?.textContent).toBe('a 1');
        clickBoth(sides, '.retitle');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelector('b')?.textContent).toBe('two');
        expect(sides.react.querySelector('i')?.textContent).toBe('a 1');
        clickBoth(sides, '.move');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelector('b')?.textContent).toBe('three');
        expect(sides.react.querySelector('i')?.textContent).toBe('b 2');
    });

    it('createExoNode, wireExoNode and the port methods place, move, take out and destroy children as Exodra does', () => {
        const sides = mountBoth(CHILDREN_SOURCE, 'BOARD', 'Board');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelector('.open')?.textContent).toBe('latewriteshiprest');
        for (const selector of [
            '.archive-first',
            '.rewire',
            '.reorder',
            '.take-out',
            '.put-back',
            '.archive-first',
            '.destroy',
            '.clear',
        ]) {
            clickBoth(sides, selector);
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelector('.open')?.textContent).toBe('');
        expect(sides.react.querySelector('.archive')?.textContent).toBe('done of 3');
    });

    it('createExoChildrenReconciler keeps rows by key between a fixed head and foot, and re-wires a renamed row', () => {
        const sides = mountBoth(RECONCILER_SOURCE, 'RECONCILED', 'Reconciled');
        expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        expect(sides.react.querySelector('ul')?.textContent).toBe('0:head1:a2:b3:c99:foot');
        const b = sides.react.querySelectorAll('li')[2];
        for (const selector of ['.reverse', '.rename', '.drop', '.add', '.reverse']) {
            clickBoth(sides, selector);
            expect(sides.react.innerHTML).toBe(sides.exodra.innerHTML);
        }
        expect(sides.react.querySelector('ul')?.textContent).toBe('0:head12:n1:a2:bee99:foot');
        expect(sides.react.querySelectorAll('li')[3]).toBe(b);
    });

    it('withExoTransitions refuses a name an earlier step declared, and a name made of digits', () => {
        const runtime = runReact(COUNTER_SOURCE)[RUNTIME_KEY] as {
            createExoMachine(schema: unknown): unknown;
            exoReactSchema(
                kinds: object,
                elements: readonly unknown[],
                render: () => null
            ): unknown;
            withExoTransitions(machine: unknown, transitions: object): unknown;
        };
        const base = runtime.createExoMachine(runtime.exoReactSchema({}, [], () => null));
        const first = runtime.withExoTransitions(base, { open: () => undefined });
        expect(() => runtime.withExoTransitions(first, { open: () => undefined })).toThrow(
            "withExoTransitions: 'open' is already a transition of this machine, or is an index."
        );
        expect(() => runtime.withExoTransitions(base, { 0: () => undefined })).toThrow(
            "withExoTransitions: '0' is already a transition of this machine, or is an index."
        );
    });

    const UNSUPPORTED_SOURCES: readonly { what: string; source: string; unsupported: string }[] = [
        {
            what: 'names an Exodra import the React runtime has no counterpart for',
            source: COUNTER_SOURCE.replace(
                'import { composeExoMachine,',
                'import { createExoSchema, composeExoMachine,'
            ),
            unsupported: 'createExoSchema from @exodra/core has no React form',
        },
        {
            what: 'names an exoJsx schema that is not one returned element',
            source: COUNTER_SOURCE.replace(
                /exoJsx<([^>]*)>\(\(\$\) => \(/,
                'exoJsx<$1>(($) => maybe && ('
            ),
            unsupported: 'COUNTER_SCHEMA: exoJsx body is not one returned element',
        },
    ];

    for (const c of UNSUPPORTED_SOURCES) {
        it(c.what, () => {
            expect(translateExoToReact(c.source).unsupported).toEqual([c.unsupported]);
        });
    }
});
