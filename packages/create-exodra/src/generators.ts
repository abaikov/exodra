// Pure source-code generators used by the `exodra` scaffolding CLI.
//
// These produce REAL, working Exodra code on the SCHEMA CORE — the same shape the
// `--app` scaffold in `index.ts` emits, so a file generated here drops into a
// generated app and works:
//  - a component is a MACHINE: `createExoSchema(build)` walks the shape ONCE, when the
//    module loads; `createExoMachine(schema, { createInitialState })` runs it once per instance
//    for its state, and the wire `composeExoMachine` adds with `withExoWire` fills `schema.ports`.
//  - `createInitialState` is handed `(exonode, params)`. There are no props: an instance is
//    handed the params its parent passed to `c.one`, `c.list` or `c.build`.
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
 * `c.list(port, Name, params)`.
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
        ? "import type { TExoMachineNode } from '@exodra/core';\n"
        : '';
    const camelName = componentName.charAt(0).toLowerCase() + componentName.slice(1);
    const portsName = `${componentName}Ports`;
    const schemaName = `${camelName}Schema`;
    const baseName = `${camelName}Base`;
    const paramsName = `T${componentName}Params`;
    const paramsType = useTypeScript
        ? `export type ${paramsName} = { readonly label: string };\n\n`
        : '';
    const initialStateArgs = useTypeScript
        ? `_c: TExoMachineNode, params: ${paramsName}`
        : '_c, params';

    return `import {
  EXO_PORT_TEXT,
  composeExoMachine,
  createExoMachine,
  createExoSchema,
  exoPorts,
  withExoWire,
} from '@exodra/core';
${typeImports}
// Each row is handed its params, never props:
// \`c.list(ParentPorts.slot, ${componentName}, [{ label: '${componentName}' }])\`.
${paramsType}const ${portsName} = exoPorts({ label: EXO_PORT_TEXT });

const ${schemaName} = createExoSchema(${portsName}, b => {
  b.el('div', { class: '${className}' }, d => {
    d.textPort(${portsName}.label);
  });
});
const ${baseName} = createExoMachine(${schemaName}, {
  createInitialState: (${initialStateArgs}) => ({ label: params.label }),
});
export const ${componentName} = composeExoMachine(${baseName}, m =>
  withExoWire(m, c => {
    c.text(${portsName}.label, c.state.label);
  })
);
`;
}

/**
 * A page: a machine default-exported from its module, which is what the
 * generated route table resolves and what the router will mount.
 * @param pageName Exported identifier base (already formatted, e.g. `Home`).
 */
export function generatePageFile(pageName: string): string {
    return `import {
  EXO_PORT_TEXT,
  composeExoMachine,
  createExoMachine,
  createExoSchema,
  exoPorts,
  withExoWire,
} from '@exodra/core';

// A page takes no props — the match that selected it arrives as the params of its wire,
// \`withExoWire(m, (c, match) => …)\`, whose \`params\` and \`pathname\` are what a page needs. It is
// default-exported because the route table imports it that way.
const PagePorts = exoPorts({ heading: EXO_PORT_TEXT });

const pageSchema = createExoSchema(PagePorts, b => {
  b.el('div', { class: 'page' }, d => {
    d.el('h1', null, h => {
      h.textPort(PagePorts.heading);
    });
    d.el('p', null, p => p.text('Welcome to the ${pageName} page.'));
  });
});
const pageBase = createExoMachine(pageSchema);
export default composeExoMachine(pageBase, m =>
  withExoWire(m, c => {
    c.text(PagePorts.heading, '${pageName}');
  })
);
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
