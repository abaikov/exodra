// @vitest-environment jsdom
//
// These tests guarantee the scaffolding generators emit REAL, working Exodra
// code — not just plausible-looking strings. Each generated module is compiled
// (ESM -> CJS) and executed against the real @exodra/core + @exodra/dom, then
// mounted into a jsdom document and asserted on.
//
// What they are guarding since the generators moved to the schema core: a file
// produced by `npx exodra page Name` must be the SAME KIND OF MODULE the `--app`
// scaffold writes into `src/pages`, because it lands in the same route table. The
// router mounts a `{ schema, machine }` pair and nothing else — a page that regressed
// to an `hLegacy()` schema or a renderer function would scaffold fine and throw the
// first time its route was visited, which is what `isExoPageMachine` below is
// asserted for.
//
// AND THAT THE EMITTED CODE NAMES LIVE DOORS. The write doors are `attr`/`text`/
// `unsafeHtml`/`on`; there is no `set` and no `bind*` call on any backend, and
// `createInitialState` takes `(exonode, index)` with no props. A generator emitting the old
// spelling produces a file that throws on its first instance, which the mounting
// cases below are what catch.

import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import * as exodraCore from '@exodra/core';
import * as exodraDom from '@exodra/dom';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort } from '@exodra/core';

import type { TExoDomMachine, TExoDomNode } from '@exodra/dom';
import { isExoPageMachine } from '@exodra/router';
import type { TExoRouteMachine } from '@exodra/router';
import { generateComponentFile, generatePageFile, generateApiFile } from '../generators';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

// Compile a generated ESM/TS source string and execute it with a require shim
// pointing at the real Exodra packages, returning its module exports. Only the
// packages a generated module may import AT RUNTIME are in the shim: the router
// is imported for its types alone, so a `require` of it here would mean a
// type-only import had been emitted as a value one.
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

/**
 * Mount one instance of a generated component the way an application does: from a
 * parent's `wire`, through a children port. There is no props argument — `index` is the
 * whole of what an instance is handed, so the data it shows was put where it could
 * reach it before this ran.
 */
function mountOne(component: TExoDomMachine, container: HTMLElement): () => void {
    const HOST_SCHEMA = createExoSchema((b) => {
        let slot!: TExoChildrenPort;
        b.el('section', null, (s) => {
            slot = s.childrenPort();
        });
        return { slot };
    });
    const mHost = createExoMachineBuilder<TExoDomNode>(HOST_SCHEMA);
    mHost.createInitialState((c) => {
        c.one(HOST_SCHEMA.ports.slot, component);
    });
    return EXO_BACKEND.render(mHost.done(), container);
}

describe('component generator', () => {
    const ts = generateComponentFile('Button', 'button', true);
    const js = generateComponentFile('Button', 'button', false);

    it('emits a schema-core component, not the previous runtime', () => {
        expect(ts).toContain(
            "import { createExoMachineBuilder, createExoSchema } from '@exodra/core'"
        );
        expect(ts).not.toContain('@exodra/wire');
        expect(ts).not.toContain('@exodra/jsx');
        // `hLegacy` / `defineComponentLegacy` / `mountLegacy` — the runtime this
        // generator used to emit, and which the current router refuses.
        expect(ts).not.toContain('Legacy');
        expect(ts).toContain('textPort()');
        expect(ts).toContain('createInitialState((_c, i) => ({ label: ButtonLabels[i] }))');
        expect(ts).toContain('c.text(BUTTON_SCHEMA.ports.label, c.state.label)');
        expect(ts).toContain('export const Button = mButton.done();');
    });

    it('names only doors that still exist', () => {
        // `c.set` was the write door and is gone — `attr`/`text`/`html`/`on` are the whole set.
        // Every `bind*` call was deleted from every backend, so a generated file that spelled one
        // would throw on its first instance.
        for (const source of [ts, js]) {
            expect(source).not.toMatch(/\bc\.set\(/);
            expect(source).not.toMatch(/\bc\.bind/);
            expect(source).not.toContain('withExoBinding');
        }
    });

    it('takes no props: createInitialState is handed its position', () => {
        // `createInitialState` is `(enode, index) => TValue`. `props` does not exist on any
        // backend, so a generated machine that read one would be reading `undefined`.
        for (const source of [ts, js]) {
            expect(source).toContain('createInitialState((_c, i) =>');
            expect(source).not.toMatch(/\(c,\s*props\)/);
            expect(source).not.toMatch(/props\./);
        }
    });

    it('emits types only in the TypeScript variant', () => {
        expect(ts).toContain("import type { TExoMachineNode, TExoTextPort } from '@exodra/core'");
        // The port's holder is declared before the call that mints it — a port escapes a nested
        // closure — so the scaffold has to SPELL the port's type, and it spells the named one.
        expect(ts).toContain('let label!: TExoTextPort;');
        expect(ts).toContain('export const ButtonLabels: string[] = [];');
        expect(js).not.toContain('import type');
        expect(js).not.toContain('TExoMachineNode');
        expect(js).toContain('createExoMachineBuilder(BUTTON_SCHEMA)');
        expect(js).toContain('let label;');
        expect(js).toContain('export const ButtonLabels = [];');
    });

    it('types the machine against the SHARED surface, not against a backend', () => {
        // THE SCAFFOLD IS THE MOST-COPIED EXAMPLE THIS PROJECT SHIPS, so what it types a machine
        // as decides what most components in the wild can run on. `TExoDomNode` names
        // the browser exonode, and a machine's exonode parameter is contravariant, so a component
        // scaffolded that way can never be served by `@exodra/string` or hydrated. Asserted in
        // both directions, because "contains the right thing" is also satisfied by a file that
        // contains the wrong one beside it.
        expect(ts).toContain(
            'createExoMachineBuilder<TExoMachineNode, unknown, { label: string }>(BUTTON_SCHEMA)'
        );
        expect(ts).not.toContain('TExoDomNode');
        expect(ts).not.toContain("from '@exodra/dom'");
    });

    for (const [variant, source] of [
        ['typescript', ts],
        ['javascript', js],
    ] as const) {
        it(`compiles and mounts to real DOM (${variant})`, () => {
            const mod = evalModule(source);
            const labels = mod.ButtonLabels as string[];
            const Button = mod.Button as TExoDomMachine;
            const container = freshContainer();

            labels.push('Click me');
            const dispose = mountOne(Button, container);

            const root = container.querySelector('.button');
            expect(root).not.toBeNull();
            expect(root?.tagName.toLowerCase()).toBe('div');
            expect(root?.textContent).toBe('Click me');

            dispose();
        });
    }
});

describe('page generator', () => {
    const ts = generatePageFile('Home', true);
    const js = generatePageFile('Home', false);

    it('emits a default-exported schema-core page', () => {
        expect(ts).toContain(
            "import { createExoMachineBuilder, createExoSchema } from '@exodra/core'"
        );
        expect(ts).toContain('export default mPage.done();');
        expect(ts).not.toContain('@exodra/wire');
        expect(ts).not.toContain('@exodra/jsx');
        expect(ts).not.toContain('Legacy');
    });

    it('types the page against the SHARED surface and takes no props', () => {
        expect(ts).toContain('createExoMachineBuilder<TExoMachineNode>(PAGE_SCHEMA)');
        // Not `TExoDomNode` — a page typed against the browser exonode cannot be
        // rendered by `@exodra/string`, which is the whole of what an SSR'd route is. See the
        // component generator's own case for the argument.
        expect(ts).not.toContain('TExoDomNode');
        // The route match used to arrive as props. There are none: a page reads it from the
        // router it was given, so the page module imports nothing from `@exodra/router` and the
        // test shim below would throw if it did.
        for (const source of [ts, js]) {
            expect(source).not.toContain("from '@exodra/router'");
            expect(source).not.toMatch(/\(c,\s*props\)/);
            expect(source).not.toMatch(/props\./);
            expect(source).not.toMatch(/\bc\.set\(/);
        }
        expect(js).not.toContain('import type');
    });

    it('exports something the router will actually mount', () => {
        // The router refuses anything that is not a `{ schema, machine }` pair, so this is the
        // assertion that a generated page can be routed at all.
        const mod = evalModule(ts);
        expect(isExoPageMachine(mod.default as TExoRouteMachine)).toBe(true);
    });

    for (const [variant, source] of [
        ['typescript', ts],
        ['javascript', js],
    ] as const) {
        it(`compiles and mounts, rendering heading + copy (${variant})`, () => {
            const mod = evalModule(source);
            const Page = mod.default as TExoDomMachine;
            const container = freshContainer();

            const dispose = mountOne(Page, container);

            const page = container.querySelector('.page');
            expect(page).not.toBeNull();
            expect(page?.querySelector('h1')?.textContent).toBe('Home');
            expect(page?.querySelector('p')?.textContent).toContain('Welcome to the Home page.');

            dispose();
        });
    }
});

describe('api generator', () => {
    const source = generateApiFile('users', false);

    it('emits GET and POST handlers', () => {
        expect(source).toContain('export async function GET');
        expect(source).toContain('export async function POST');
        expect(source).toContain('API route users');
    });

    it('annotates the request only in the TypeScript variant', () => {
        // An unannotated parameter in a .ts file is an implicit `any`, which fails
        // the `tsc` step of the generated project's build.
        expect(generateApiFile('users', true)).toContain('POST(request: Request)');
        expect(source).toContain('POST(request)');
    });

    it('compiles to a module exporting both handlers', () => {
        const mod = evalModule(source);
        expect(typeof mod.GET).toBe('function');
        expect(typeof mod.POST).toBe('function');
    });
});
