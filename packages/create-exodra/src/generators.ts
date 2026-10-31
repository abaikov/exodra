// Pure source-code generators used by the `exodra` scaffolding CLI.
//
// These produce REAL, working Exodra code on the SCHEMA CORE — the same shape the
// `--app` scaffold in `index.ts` emits, so a file generated here drops into a
// generated app and works:
//  - a component is a MACHINE: `createExoSchema(build)` walks the shape ONCE, when the
//    module loads; `createInitialState` runs once per instance and returns its state, and
//    `wire` fills `schema.ports` from it.
//  - `createInitialState` is handed `(exonode, index)`. There are no props: an instance is
//    handed its POSITION, so the data it shows is read by index from somewhere the caller put
//    it.
//  - the write doors are `attr`, `text`, `unsafeHtml` and `on`, and nothing else. Keeping a
//    port in step with a source is an effect that draws through a transition and subscribes.
//  - a page is DEFAULT-exported, because the route table the vite plugin generates
//    wraps every page module in `exoLazy(() => import(...))`, and the router mounts
//    nothing but a `{ schema, machine }` pair.
//  - there is no JSX in any of it, so none of it needs the babel plugin to compile.
//
// The TypeScript/JavaScript split is the one the `--app` scaffold uses: the types
// are the only difference, and both variants are the same code.
//
// They are kept side-effect free and string-only so they can be unit-tested by
// compiling + mounting their output (see tests/generators.test.ts).

/**
 * A standalone component, filled from a parent with `c.one(port, Name)` or repeated with
 * `c.list(port, Name, count)`.
 * @param componentName Exported identifier (already formatted, e.g. `UserCard`).
 * @param className CSS class applied to the root element.
 * @param useTypeScript Emit type annotations (the file is written as .tsx).
 */
export function generateComponentFile(
    componentName: string,
    className: string,
    useTypeScript: boolean
): string {
    // THE SURFACE, NOT A BACKEND. A machine's exonode parameter is CONTRAVARIANT, so a component
    // scaffolded against `TExoDomNode` could never be rendered by `@exodra/string` or hydrated,
    // whatever else the app does. The generated machine calls `c.text` and nothing else, so the
    // MINIMAL surface is the honest type; a machine that nests components takes `TExoChildrenWiring & TExoMachineNode`.
    const typeImports = useTypeScript
        ? "import type { TExoMachineNode, TExoTextPort } from '@exodra/core';\n"
        : '';
    const labelPort = useTypeScript ? 'let label!: TExoTextPort;' : 'let label;';
    const schemaName = `${componentName
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toUpperCase()}_SCHEMA`;
    const builderName = `m${componentName}`;
    const builderType = useTypeScript ? '<TExoMachineNode, unknown, { label: string }>' : '';
    const store = useTypeScript
        ? `export const ${componentName}Labels: string[] = [];`
        : `export const ${componentName}Labels = [];`;

    return `import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
${typeImports}
// The data each instance shows, read BY INDEX: an instance is handed its position, never props, so a
// parent fills this and then names the count:
// \`${componentName}Labels.push('${componentName}'); c.list(PARENT_SCHEMA.ports.slot, ${componentName}, 1)\`.
${store}

const ${schemaName} = createExoSchema(b => {
  ${labelPort}
  b.el('div', { class: '${className}' }, d => {
    label = d.textPort();
  });
  return { label };
});
const ${builderName} = createExoMachineBuilder${builderType}(${schemaName});
${builderName}.createInitialState((_c, i) => ({ label: ${componentName}Labels[i] }));
${builderName}.wire(c => {
  c.text(${schemaName}.ports.label, c.state.label);
});
export const ${componentName} = ${builderName}.done();
`;
}

/**
 * A page: a machine default-exported from its module, which is what the
 * generated route table resolves and what the router will mount.
 * @param pageName Exported identifier base (already formatted, e.g. `Home`).
 * @param useTypeScript Emit type annotations (the file is written as .tsx).
 */
export function generatePageFile(pageName: string, useTypeScript: boolean): string {
    const typeImports = useTypeScript
        ? "import type { TExoMachineNode, TExoTextPort } from '@exodra/core';\n"
        : '';
    const headingPort = useTypeScript ? 'let heading!: TExoTextPort;' : 'let heading;';
    const builderType = useTypeScript ? '<TExoMachineNode>' : '';

    return `import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
${typeImports}
// A page takes no props — the match that selected it arrives as the params of its wire,
// \`mPage.wire((c, match) => …)\`, whose \`params\` and \`pathname\` are what a page needs. It is
// default-exported because the route table imports it that way.
const PAGE_SCHEMA = createExoSchema(b => {
  ${headingPort}
  b.el('div', { class: 'page' }, d => {
    d.el('h1', null, h => {
      heading = h.textPort();
    });
    d.el('p', null, p => p.text('Welcome to the ${pageName} page.'));
  });
  return { heading };
});
const mPage = createExoMachineBuilder${builderType}(PAGE_SCHEMA);
mPage.wire(c => {
  c.text(PAGE_SCHEMA.ports.heading, '${pageName}');
});
export default mPage.done();
`;
}

/**
 * An API route module exporting GET/POST handlers.
 * @param routeName Used only in the placeholder response body.
 * @param useTypeScript Annotate the request parameter — an unannotated one is an
 * implicit `any`, which fails the `tsc` step of the generated project's build.
 */
export function generateApiFile(routeName: string, useTypeScript: boolean): string {
    const request = useTypeScript ? 'request: Request' : 'request';
    return `export async function GET() {
  return new Response(JSON.stringify({ message: 'API route ${routeName}' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(${request}) {
  const body = await request.json();
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}
`;
}
