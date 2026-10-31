# @exodra/react-compat

React's public API implemented on **Exodra machines**. Alias `react` and
`react-dom` to it and an existing React application — its components, hooks and
npm libraries — runs with Exodra as the renderer. Every host tag is a machine
with a schema; a re-render writes into the same DOM nodes through it, with no
virtual DOM in between.

This is the third React direction, next to
[`@exodra/react`](https://www.npmjs.com/package/@exodra/react) (React inside an
Exodra tree) and
[`@exodra/react-mount`](https://www.npmjs.com/package/@exodra/react-mount)
(Exodra inside a React tree).

```bash
npm install @exodra/react-compat
# peers:
npm install @exodra/core @exodra/dom @exodra/list-reconcile
```

`@exodra/core`, `@exodra/dom` and `@exodra/list-reconcile` are **peer
dependencies**, and nothing is bundled into this package.

## Entry points

| Entry | Stands in for |
| --- | --- |
| `@exodra/react-compat` | `react` and `react-dom` |
| `@exodra/react-compat/client` | `react-dom/client` |
| `@exodra/react-compat/server` | `react-dom/server` |
| `@exodra/react-compat/jsx-runtime` | `react/jsx-runtime` |
| `@exodra/react-compat/jsx-dev-runtime` | `react/jsx-dev-runtime` |

## Usage

Alias the React ids to the package in your bundler or test runner:

```js
// vite.config.js / vitest.config.js
export default {
    resolve: {
        alias: [
            { find: /^react$/, replacement: '@exodra/react-compat' },
            { find: /^react\/jsx-runtime$/, replacement: '@exodra/react-compat/jsx-runtime' },
            { find: /^react\/jsx-dev-runtime$/, replacement: '@exodra/react-compat/jsx-dev-runtime' },
            { find: /^react-dom$/, replacement: '@exodra/react-compat' },
            { find: /^react-dom\/client$/, replacement: '@exodra/react-compat/client' },
            { find: /^react-dom\/server$/, replacement: '@exodra/react-compat/server' },
        ],
    },
};
```

Your React code does not change. Optionally, `@exodra/babel-plugin-schema/react`
compiles the host JSX in your own files into hoisted Exodra schemas; the elements
it produces stay real elements, so `cloneElement` and `child.props` keep working.

## Documentation

The guide — aliasing for Vite, webpack and Vitest (including the CommonJS and
styled-components details), the compiler, the supported API, the libraries
tested on it, and every known difference from React — is at
[exodra.org: React Code on Exodra](https://exodra.org/docs/guides/react-compat).

## License

MIT
