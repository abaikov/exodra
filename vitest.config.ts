import { defineConfig, configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const aliasPath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@exodra/core': aliasPath('./packages/core/src/index.ts'),
            '@exodra/dom': aliasPath('./packages/dom/src/index.ts'),
            '@exodra/jsx/jsx-runtime': aliasPath(
                './packages/jsx/src/jsx-runtime.ts'
            ),
            '@exodra/jsx/jsx-dev-runtime': aliasPath(
                './packages/jsx/src/jsx-dev-runtime.ts'
            ),
            '@exodra/jsx': aliasPath('./packages/jsx/src/index.ts'),
            '@exodra/reactivity': aliasPath(
                './packages/reactivity/src/index.ts'
            ),
            '@exodra/router': aliasPath('./packages/router/src/index.ts'),
            '@exodra/string': aliasPath('./packages/string/src/index.ts'),
            '@exodra/ssr': aliasPath('./packages/ssr/src/index.ts'),
        },
    },
    test: {
        globals: true,
        // Default to node environment; DOM tests opt into jsdom per file.
        environment: 'node',
        fileParallelism: false,
        // @exodra/introspect runs ts-morph static analysis over real package
        // directories — those integration tests legitimately take several
        // seconds, so the 5s default is too tight and flakes on timeout.
        testTimeout: 30000,
        // Never collect tests from build output (compiled *.test.js duplicates).
        exclude: [...configDefaults.exclude, '**/dist/**'],
    },
});

