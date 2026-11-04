// THE TWO COMPILERS, ON THE SAME INPUT, COMPARED.
//
// `@exodra/babel-plugin-schema` is the SPECIFICATION and this crate is its Rust port. Until
// this file existed, nothing in the repository ever handed one source to both and looked at
// the two answers: `plugin.test.ts` asserts what SWC emits and the Babel package's own suite
// asserts what Babel emits, in two files, written by hand, kept in step by whoever remembered.
//
// IT IS TWO GATES.
//
//  1. REFUSAL PARITY — for a source neither compiler may accept, BOTH must refuse, and SWC's
//     diagnostic must carry Babel's message whole.
//
//  2. EMIT PARITY — for a source both accept, the emitted programs must be the same program.
//     They are not the same TEXT: SWC's printer parenthesises a single arrow parameter and
//     spaces things its own way, which is what the crate's README means by "identical up to
//     SWC's own codegen formatting". So both sides go through `canon` below, and a failure
//     prints both raw outputs, because when this half goes red the first question is always
//     "is this a real difference or a printer difference".
//
// The `.wasm` is a build artifact and is not checked in, so this file skips itself the same
// way `plugin.test.ts` does — and for the same reason: asserting against a stale artifact
// reports a difference that was fixed three weeks ago.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
// BY RELATIVE PATH, not by package name. The root vitest config aliases the runtime
// packages to source and does not alias this one, and requiring the Babel plugin's `dist`
// would compare this crate against whatever was last BUILT rather than against the
// specification as it is written right now.
import babelPlugin from '../../babel-plugin-exodra-schema/src/index';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const wasm = resolve(here, '..', 'swc_plugin_exodra.wasm');
const rustSrc = resolve(here, '..', 'src');

function rustSources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return rustSources(full);
        return entry.name.endsWith('.rs') ? [full] : [];
    });
}

const wasmBuilt = existsSync(wasm);
const newestSource = Math.max(...rustSources(rustSrc).map((f) => statSync(f).mtimeMs));
const wasmFresh = wasmBuilt && statSync(wasm).mtimeMs >= newestSource;

let swc: typeof import('@swc/core') | null = null;
try {
    if (wasmBuilt) swc = require('@swc/core');
} catch {
    swc = null;
}

const d = swc && wasmFresh ? describe : describe.skip;
if (!swc || !wasmFresh) {
    console.warn(
        '[parity.test] wasm missing, stale or @swc/core unavailable — skipping. Run ' +
            '`npm run build:wasm` from the repo root; every assertion here would otherwise ' +
            'be comparing Babel against a previous build of the Rust.'
    );
}

type TExoParityOptions = Readonly<Record<string, string>>;

function compileSwc(source: string, options: TExoParityOptions): string {
    return swc!.transformSync(source, {
        filename: 'in.tsx',
        jsc: {
            parser: { syntax: 'typescript', tsx: true },
            target: 'es2022',
            experimental: { plugins: [[wasm, { ...options }]] },
        },
    }).code;
}

function compileBabel(source: string, options: TExoParityOptions): string {
    const result = babel.transformSync(source, {
        filename: 'in.jsx',
        babelrc: false,
        configFile: false,
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            // The Rust port emits declarations only; the JSON forms are the Babel plugin's alone.
            [babelPlugin as unknown as babel.PluginItem, { ...options, jsonDeclarations: false }],
        ],
    });
    if (result?.code === undefined || result.code === null) {
        throw new Error('the Babel plugin produced no code');
    }
    return result.code;
}

/**
 * ONE PROGRAM, SPELLED THE SAME WAY BY BOTH PRINTERS.
 *
 * Two normalisations and no more, each for a difference that is the PRINTER's and not the
 * compiler's:
 *
 *  - SWC writes `(_b0)=>{…}` where Babel writes `_b0 => {…}`. The parentheses around a
 *    single plain parameter carry no meaning, and every arrow either compiler generates has
 *    one plain parameter.
 *  - Everything else is whitespace, which both printers place by their own rules.
 *
 * Anything a normalisation would have to be ADDED for is a difference worth looking at
 * before it is normalised away, which is why this function is short on purpose.
 */
function canon(code: string): string {
    return code.replace(/\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*=>/g, '$1=>').replace(/\s+/g, '');
}

// SWC's report renderer may wrap a long message and prefix each line with a gutter.
function flatMessage(message: string): string {
    return message.replace(/[\s│|]+/g, '');
}

function babelMessage(error: string): string {
    return error.slice(error.indexOf('Exodra JSX:')).split('\n')[0];
}

type TExoEmitCase = {
    readonly what: string;
    readonly source: string;
    readonly options?: TExoParityOptions;
};

const EMIT_CASES: readonly TExoEmitCase[] = [
    {
        what: 'every port kind, and the marker import dropped once nothing names it',
        source: `
            import { exoJsx } from '@exodra/jsx';
            export const COUNTER = exoJsx(($) => (
                <div class="counter" data-n={$.n}>
                    <span>{$.count}</span>
                    <button type="button" onClick={$.increment} on:dblclick={$.reset}>+</button>
                    <$.rows />
                    <div ref={$.box} unsafeHtml={$.html} />
                </div>
            ));
        `,
    },
    {
        what: 'onClick lowers its tail; on: keeps the name as written',
        source: `const V = exoJsx(($) => <li onDblClick={$.a} onKeyDown={$.b} on:myThing={$.c} />);`,
    },
    {
        what: 'every literal attribute is markup',
        source: `const V = exoJsx(() => <input type="checkbox" tabindex={0} checked disabled={false} />);`,
    },
    {
        what: 'a key that is not a plain name is written as a string',
        source: `const V = exoJsx(() => <li data-kind="row" aria-label="x" />);`,
    },
    {
        what: 'static text, and the whitespace rule around it',
        source: `const V = exoJsx(() => (\n    <div class="card">\n        <h3>\n            Heading\n        </h3>\n        <p>one two</p>\n    </div>\n));`,
    },
    {
        what: 'a declaration with no ports and no parameter',
        source: `export const S = exoJsx(() => <hr class="rule" />);`,
    },
    {
        what: 'the holder name the author chose',
        source: `const A = exoJsx((port) => <li title={port.label} />);`,
    },
    {
        what: 'a bracketed port name',
        source: `const A = exoJsx(($) => <li title={$['row-label']} data-x={$["x"]} />);`,
    },
    {
        what: 'a children port between static siblings, and a text port in a nested element',
        source: `
            const L = exoJsx(($) => (
                <ul class="list">
                    <li class="head">head</li>
                    <$.rows />
                    <li class="tail"><b>{$.count}</b></li>
                </ul>
            ));
        `,
    },
    {
        what: 'a `function` declaration',
        source: `const A = exoJsx(function ($) { return <li>{$.t}</li>; });`,
    },
    {
        what: 'hoisted out of a function, in front of the statement holding it',
        source: `
            const before = 1;
            function makeRow() {
                return exoJsx(($) => <li>{$.t}</li>);
            }
            export const ROW = exoJsx(($) => <li>{$.t}</li>);
        `,
    },
    {
        what: 'a declaration built in a loop is still ONE schema',
        source: `
            const views = [];
            for (const p of parts) {
                views.push(exoJsx(($) => <li>{$.t}</li>));
            }
        `,
    },
    {
        what: 'two declarations in one statement are numbered in order',
        source: `const both = [exoJsx(($) => <li>{$.a}</li>), exoJsx(($) => <li>{$.b}</li>)];`,
    },
    {
        what: 'a file with no declaration is left alone entirely',
        source: `export const x = 1;`,
    },
    {
        what: 'an aliased marker import is followed and dropped',
        source: `
            import { exoJsx as view } from '@exodra/jsx';
            export const ROW = view(($) => <li>{$.t}</li>);
        `,
    },
    {
        what: 'a marker import still referenced elsewhere is kept',
        source: `
            import { exoJsx, other } from '@exodra/jsx';
            export const ROW = exoJsx(($) => <li>{$.t}</li>);
            export { exoJsx, other };
        `,
    },
    {
        what: 'generated names step aside for bindings the file already has',
        source: `
            const _s0 = 'taken';
            function f(_b1) { return _b1; }
            const createExoNamedSchema = 2;
            export const ROW = exoJsx(($) => <li>{$.t}</li>);
        `,
    },
    {
        what: 'schemaSource and schemaImport',
        source: `const A = exoJsx(($) => <li>{$.t}</li>);`,
        options: { schemaSource: 'my-core', schemaImport: 'declare' },
    },
    {
        what: 'markerName compiles that call and leaves the default name alone',
        source: `
            const A = mark(($) => <li>{$.t}</li>);
            const untouched = exoJsx;
        `,
        options: { markerName: 'mark' },
    },
    {
        what: 'a module const string and a template over consts fold into markup',
        source: `
            const A = 'radius:8px';
            export const B = \`\${A};gap:4px\`;
            const V = exoJsx(($) => <div class={A} style={\`flex:none;\${B}\`}><$.rows /></div>);
        `,
    },
    {
        what: 'an import and a module const are read when the schema compiles',
        source: `
            import styles from './Row.module.css';
            import * as tokens from './tokens';
            import { PANEL } from '../theme';
            const THEME = { gap: 'gap:4px' };
            const V = exoJsx(($) => (
                <li class={styles['row-active']} style={PANEL} title={THEME.gap} data-tone={tokens.tone}>{$.t}</li>
            ));
        `,
    },
    {
        what: 'camelCase SVG tags keep their spelling',
        source: `
            const V = exoJsx(($) => (
                <svg>
                    <defs><linearGradient id="g"><stop offset="0" /></linearGradient></defs>
                    <circle r="1"><animateMotion dur="1s"><mpath href="#p" /></animateMotion></circle>
                    <text><tspan>{$.t}</tspan></text>
                </svg>
            ));
        `,
    },
    {
        what: 'a module const folds into a declaration inside a function',
        source: `
            const ZONE = 'z';
            function view() { return exoJsx(($) => <div class={ZONE} />); }
        `,
    },
];

type TExoRefusalCase = {
    readonly what: string;
    readonly source: string;
    readonly signature: string;
    readonly options?: TExoParityOptions;
};

const REFUSAL_CASES: readonly TExoRefusalCase[] = [
    {
        what: 'an attribute expression that is not a port',
        source: `const V = exoJsx(($) => <li title={item.title} />);`,
        signature: 'title={…} on <li> is an expression',
    },
    {
        what: 'a port off a declaration that has no parameter',
        source: `const V = exoJsx(() => <li title={$.t} />);`,
        signature: 'title={…} on <li> is an expression',
    },
    {
        what: 'a child expression that is not a port',
        source: `const V = exoJsx(($) => <li>{item.title}</li>);`,
        signature: '{…} inside <li> is an expression',
    },
    {
        what: 'a closure where an event port belongs',
        source: `const V = exoJsx(($) => <li onClick={() => go()} />);`,
        signature: 'onClick on <li> takes a port — write onClick={$.name}',
    },
    {
        what: 'a reference on on:',
        source: `const V = exoJsx(($) => <li on:click={go} />);`,
        signature: 'on:click on <li> takes a port',
    },
    {
        what: 'an inline HTML handler',
        source: `const V = exoJsx(($) => <li onclick="go()" />);`,
        signature: '"onclick" on <li> is an inline HTML handler',
    },
    {
        what: 'a namespace other than on:',
        source: `const V = exoJsx(($) => <li set:title={$.t} />);`,
        signature: '"set:title" on <li> — the one namespace is on:',
    },
    {
        what: 'a spread',
        source: `const V = exoJsx(($) => <li {...rest} />);`,
        signature: '{...spread} on <li>',
    },
    {
        what: 'a component tag',
        source: `const V = exoJsx(($) => <ul><Row /></ul>);`,
        signature: '<Row> is not an element, and a declaration has no components',
    },
    {
        what: 'a dotted component tag',
        source: `const V = exoJsx(($) => <ul><ui.Row /></ul>);`,
        signature: '<ui.Row> is not an element',
    },
    {
        what: 'a namespaced tag',
        source: `const V = exoJsx(($) => <svg><svg:rect /></svg>);`,
        signature: '<svg:rect> is not an element',
    },
    {
        what: 'a children port as the root',
        source: `const V = exoJsx(($) => <$.rows />);`,
        signature: '<$.rows> is not an element tag',
    },
    {
        what: 'attributes on a children port',
        source: `const V = exoJsx(($) => <ul><$.rows list={3} /></ul>);`,
        signature: '<$.rows /> is a children port and takes no attributes',
    },
    {
        what: 'children on a children port',
        source: `const V = exoJsx(($) => <ul><$.rows>x</$.rows></ul>);`,
        signature: '<$.rows /> is a children port and takes no children',
    },
    {
        what: 'a text port beside other children',
        source: `const V = exoJsx(($) => <li>Hi, {$.name}</li>);`,
        signature: '{$.name} inside <li> stands beside other children',
    },
    {
        what: 'unsafeHtml beside children',
        source: `const V = exoJsx(($) => <div unsafeHtml={$.html}>x</div>);`,
        signature: 'has unsafeHtml={…} and children',
    },
    {
        what: 'unsafeHtml that is not a port',
        source: `const V = exoJsx(($) => <div unsafeHtml="<b>x</b>" />);`,
        signature: 'unsafeHtml on <div> takes a port',
    },
    {
        what: 'a port name used twice',
        source: `const V = exoJsx(($) => <li title={$.t}><b>{$.t}</b></li>);`,
        signature: 'the port "t" is declared twice',
    },
    {
        what: 'a fragment at the root',
        source: `const V = exoJsx(($) => <><li /></>);`,
        signature: 'returns ONE element and does nothing else',
    },
    {
        what: 'a fragment inside an element',
        source: `const V = exoJsx(($) => <ul><><li /></></ul>);`,
        signature: 'a fragment has no place in a declaration',
    },
    {
        what: 'work before the return',
        source: `const V = exoJsx(($) => { const x = 1; return <li />; });`,
        signature: 'returns ONE element and does nothing else',
    },
    {
        what: 'a destructured parameter',
        source: `const V = exoJsx(({ t }) => <li />);`,
        signature: 'takes ONE plain parameter',
    },
    {
        what: 'a second parameter',
        source: `const V = exoJsx(($, i) => <li />);`,
        signature: 'takes ONE plain parameter',
    },
    {
        what: 'a reference where the function literal belongs',
        source: `const V = exoJsx(build);`,
        signature: 'exoJsx() takes exactly one function literal',
    },
    {
        what: 'a second argument',
        source: `const V = exoJsx(($) => <li />, extra);`,
        signature: 'takes exactly one function literal',
    },
    {
        what: 'a refusal names the marker by the alias it was called through',
        source: `
            import { exoJsx as view } from '@exodra/jsx';
            const V = view(build);
        `,
        signature: 'view() takes exactly one function literal',
    },
    {
        what: 'JSX outside the marker',
        source: `const V = <li />;`,
        signature: 'JSX outside exoJsx()',
    },
    {
        what: 'JSX outside a renamed marker names the configured marker',
        source: `const V = <li />;`,
        signature: 'JSX outside mark()',
        options: { markerName: 'mark' },
    },
    {
        what: 'a fragment outside the marker',
        source: `const V = <><li /></>;`,
        signature: 'a fragment cannot be compiled',
    },
    {
        what: 'a function-local value in an attribute',
        source: `function f(styles) { return exoJsx(($) => <div style={styles.row} />); }`,
        signature: 'style={…} on <div> is an expression',
    },
    {
        what: 'a call off an import in an attribute',
        source: `import { tone } from './t'; const V = exoJsx(($) => <div style={tone()} />);`,
        signature: 'style={…} on <div> is an expression',
    },
    {
        what: 'a let in an attribute',
        source: `let ZONE = 'z'; const V = exoJsx(($) => <div style={ZONE} />);`,
        signature: 'style={…} on <div> is an expression',
    },
    {
        what: 'a const declared after the declaration',
        source: `const V = exoJsx(($) => <div style={ZONE} />); const ZONE = 'z';`,
        signature: 'style={…} on <div> is an expression',
    },
    {
        what: 'a const of the same statement',
        source: `const ZONE = 'z', V = exoJsx(($) => <div style={ZONE} />);`,
        signature: 'style={…} on <div> is an expression',
    },
    {
        what: 'a local const shadowing a module one',
        source: `const ZONE = 'm'; function f() { const ZONE = 'l'; return exoJsx(($) => <div style={ZONE} />); }`,
        signature: 'style={…} on <div> is an expression',
    },
    {
        what: 'the declaration parameter shadowing a module const',
        source: `const ZONE = 'm'; const V = exoJsx((ZONE) => <div style={ZONE} />);`,
        signature: 'style={…} on <div> is an expression',
    },
    {
        what: 'a module const as a child',
        source: `const ZONE = 'z'; const V = exoJsx(($) => <div>{ZONE}</div>);`,
        signature: '{…} inside <div> is an expression',
    },
];

function attempt(
    compile: (source: string, options: TExoParityOptions) => string,
    source: string,
    options: TExoParityOptions
): {
    code: string | null;
    error: string | null;
} {
    try {
        return { code: compile(source, options), error: null };
    } catch (thrown) {
        return { code: null, error: thrown instanceof Error ? thrown.message : String(thrown) };
    }
}

d('the two compilers refuse the same sources, with the same message', () => {
    for (const testCase of REFUSAL_CASES) {
        it(testCase.what, () => {
            const options = testCase.options ?? {};
            const fromBabel = attempt(compileBabel, testCase.source, options);
            const fromSwc = attempt(compileSwc, testCase.source, options);

            expect(
                fromBabel.error,
                `@exodra/babel-plugin-schema is the SPECIFICATION and it ACCEPTED a source ` +
                    `this file says neither compiler may take (${testCase.what}).\n  source: ` +
                    `${testCase.source.trim()}\n  it emitted: ${String(fromBabel.code).slice(
                        0,
                        400
                    )}`
            ).not.toBeNull();

            expect(
                fromSwc.error,
                `THE PORT AND THE SPECIFICATION DISAGREE. Babel refused this source and ` +
                    `swc-plugin-exodra COMPILED it (${testCase.what}).\n  source: ` +
                    `${testCase.source.trim()}\n  Babel said: ${String(fromBabel.error)}\n  SWC ` +
                    `emitted: ${String(fromSwc.code).slice(0, 400)}`
            ).not.toBeNull();

            expect(
                fromBabel.error,
                `the Babel refusal no longer contains the phrase this table pins as its ` +
                    `reason.\n  wanted: ${testCase.signature}\n  got: ${String(fromBabel.error)}`
            ).toContain(testCase.signature);

            const wanted = babelMessage(fromBabel.error as string);
            expect(
                flatMessage(fromSwc.error as string),
                `BOTH COMPILERS REFUSED, BUT NOT WITH THE SAME MESSAGE.\n  Babel said: ` +
                    `${wanted}\n  SWC said: ${String(fromSwc.error)}`
            ).toContain(flatMessage(wanted));
        });
    }
});

d('the two compilers emit the same program for a source both accept', () => {
    for (const testCase of EMIT_CASES) {
        it(testCase.what, () => {
            const options = testCase.options ?? {};
            const fromBabel = attempt(compileBabel, testCase.source, options);
            const fromSwc = attempt(compileSwc, testCase.source, options);

            expect(
                fromBabel.error,
                `@exodra/babel-plugin-schema refused a source this table says both compilers ` +
                    `accept (${testCase.what}).\n  source: ${testCase.source.trim()}\n  it ` +
                    `said: ${String(fromBabel.error)}`
            ).toBeNull();
            expect(
                fromSwc.error,
                `swc-plugin-exodra refused a source Babel compiled (${testCase.what}).\n  ` +
                    `source: ${testCase.source.trim()}\n  it said: ${String(fromSwc.error)}`
            ).toBeNull();

            expect(
                canon(fromSwc.code as string),
                `THE TWO COMPILERS EMITTED DIFFERENT PROGRAMS for the same source ` +
                    `(${testCase.what}). The normalisation covers arrow parentheses and ` +
                    `whitespace and nothing else.\n\n  source:\n${testCase.source}\n\n  Babel ` +
                    `emitted:\n${fromBabel.code as string}\n\n  SWC emitted:\n${
                        fromSwc.code as string
                    }\n`
            ).toBe(canon(fromBabel.code as string));
        });
    }
});
