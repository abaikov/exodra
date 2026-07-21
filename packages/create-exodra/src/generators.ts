// Pure source-code generators used by the `exodra` scaffolding CLI.
//
// These produce REAL, working Exodra code:
//  - `h` / `text` / `defineComponent` come from `@exodra/core` (NOT `@exodra/jsx`,
//    which only exports JSX glue — `h` is a core export).
//  - props go in the typed `static` bucket; flat props are invalid in Exodra.
//  - the 3rd argument of `h()` is a cacheKey, NOT children — children live in
//    `static.children` and must be schema nodes (use `text()` for strings, since
//    a bare string is not a valid `TExoChild`).
//
// They are kept side-effect free and string-only so they can be unit-tested by
// compiling + mounting their output (see generators.test.ts).

/**
 * A standalone component, usable as `h(Name, { static: { ... } })`.
 * @param componentName Exported identifier (already formatted, e.g. `UserCard`).
 * @param className CSS class applied to the root element.
 */
export function generateComponentFile(
    componentName: string,
    className: string
): string {
    return `import { defineComponent, h, text } from '@exodra/core';

export const ${componentName} = defineComponent(() => {
  return h('div', {
    static: {
      class: '${className}',
      children: text('${componentName}'),
    },
  });
});
`;
}

/**
 * A page: a zero-arg function returning a schema, assignable to a router
 * `component` (TExoRouteRenderer). Authored with `h()` so it needs no JSX/babel
 * setup to compile.
 * @param pageName Exported identifier base (already formatted, e.g. `Home`).
 */
export function generatePageFile(pageName: string): string {
    return `import { h, text } from '@exodra/core';

export default function ${pageName}Page() {
  return h('div', {
    static: {
      class: 'page',
      children: [
        h('h1', { static: { children: text('${pageName}') } }),
        h('p', {
          static: { children: text('Welcome to the ${pageName} page.') },
        }),
      ],
    },
  });
}
`;
}

/**
 * An API route module exporting GET/POST handlers.
 * @param routeName Used only in the placeholder response body.
 */
export function generateApiFile(routeName: string): string {
    return `export async function GET() {
  return new Response(JSON.stringify({ message: 'API route ${routeName}' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request) {
  const body = await request.json();
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}
`;
}
