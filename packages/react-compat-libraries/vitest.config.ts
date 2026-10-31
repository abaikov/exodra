import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { EXO_REACT_LIBRARIES } from './EXO_REACT_LIBRARIES';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const fromPackages = (path: string): string =>
    fileURLToPath(new URL(`../${path}`, import.meta.url));

const REACT_IMPORTS = [
    'react',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react-dom',
    'react-dom/client',
];

const COMPAT_ALIASES = [
    { find: /^react$/, replacement: fromPackages('react-compat/src/index.ts') },
    { find: /^react\/jsx-runtime$/, replacement: fromPackages('react-compat/src/jsx-runtime.ts') },
    {
        find: /^react\/jsx-dev-runtime$/,
        replacement: fromPackages('react-compat/src/jsx-runtime.ts'),
    },
    { find: /^react-dom$/, replacement: fromPackages('react-compat/src/index.ts') },
    { find: /^react-dom\/client$/, replacement: fromPackages('react-compat/src/client.ts') },
    {
        find: /^styled-components$/,
        replacement: fileURLToPath(
            new URL(
                '../../node_modules/styled-components/dist/styled-components.browser.esm.js',
                import.meta.url
            )
        ),
    },
    { find: /^@exodra\/context$/, replacement: fromPackages('context/src/index.ts') },
    { find: /^@exodra\/core$/, replacement: fromPackages('core/src/index.ts') },
    { find: /^@exodra\/computed$/, replacement: fromPackages('computed/src/index.ts') },
    { find: /^@exodra\/list-reconcile$/, replacement: fromPackages('list-reconcile/src/index.ts') },
    { find: /^@exodra\/dom$/, replacement: fromPackages('dom/src/index.ts') },
    { find: /^@exodra\/reactivity$/, replacement: fromPackages('reactivity/src/index.ts') },
];

const LIBRARY_IMPORTS = EXO_REACT_LIBRARIES.flatMap((library) => [...library.imports]);

// Pre-bundled, its default export arrives wrapped in the module namespace; it imports react as ESM.
const ESM_ONLY = ['styled-components'];

const SHARED_TEST = {
    include: ['tests/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
};

const JSX = { jsx: { runtime: 'automatic' as const, importSource: 'react' } };

export default defineConfig({
    test: {
        projects: [
            {
                root: packageRoot,
                oxc: JSX,
                resolve: { alias: COMPAT_ALIASES },
                test: {
                    ...SHARED_TEST,
                    name: 'compat',
                    server: { deps: { inline: true } },
                    // Pre-bundling turns the libraries' CJS `require('react')` into an import the alias above can reach; native require would load real React.
                    deps: {
                        optimizer: {
                            client: {
                                enabled: true,
                                include: LIBRARY_IMPORTS.filter((id) => !ESM_ONLY.includes(id)),
                                exclude: [...REACT_IMPORTS, ...ESM_ONLY],
                            },
                        },
                    },
                },
            },
            {
                root: packageRoot,
                oxc: JSX,
                resolve: { dedupe: ['react', 'react-dom'] },
                test: {
                    ...SHARED_TEST,
                    name: 'react',
                },
            },
        ],
    },
});
