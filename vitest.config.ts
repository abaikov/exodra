// Layer 1 of five: docs-site/docs/architecture/gates-and-root-configs.md, "The five test layers".
import { defineConfig, configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const aliasPath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            // The context chain. `@exodra/core` itself imports it, so without this line every
            // suite in the repository resolves it out of `packages/context/dist`.
            '@exodra/context': aliasPath('./packages/context/src/index.ts'),
            '@exodra/core/style': aliasPath('./packages/core/src/style/index.ts'),
            '@exodra/core': aliasPath('./packages/core/src/index.ts'),
            // The declarative machine half. Its own two suites import `@exodra/core` by bare
            // specifier, and `packages/dom`'s and `packages/term`'s import THIS package the same
            // way; without the line they resolve out of `packages/computed/dist`, a build
            // artifact and not the sources beside them.
            '@exodra/computed': aliasPath('./packages/computed/src/index.ts'),
            // The placement passes `@exodra/dom` imports by bare specifier. Without this line
            // the suites resolve them out of `packages/list-reconcile/dist`, which is a build
            // artifact and is not what the sources beside them compile against.
            '@exodra/list-reconcile': aliasPath('./packages/list-reconcile/src/index.ts'),
            '@exodra/dom': aliasPath('./packages/dom/src/index.ts'),
            // NO `@exodra/jsx` ALIAS: no suite imports it — `exoJsx` is compiled away before a
            // run, and `@exodra/jsx/schema` is a `jsxImportSource` that only `test:types` reads.
            '@exodra/router': aliasPath('./packages/router/src/index.ts'),
            '@exodra/string': aliasPath('./packages/string/src/index.ts'),
            '@exodra/ssr': aliasPath('./packages/ssr/src/index.ts'),
            // The term backend and the suite that drives it. Neither has a
            // `node_modules/@exodra/*` symlink, so a bare specifier for either resolves
            // through these two lines and nothing else — measured: importing
            // `@exodra/conformance` from `packages/dom` failed with this alias missing,
            // though its `main` and `exports` both name `src/index.ts`.
            '@exodra/term': aliasPath('./packages/term/src/index.ts'),
            '@exodra/conformance': aliasPath('./packages/conformance/src/index.ts'),
            '@exodra/react-compat/names': aliasPath('./packages/react-compat/src/names.ts'),
            '@exodra/react-compat/jsx-runtime': aliasPath(
                './packages/react-compat/src/jsx-runtime.ts'
            ),
            '@exodra/react-compat': aliasPath('./packages/react-compat/src/index.ts'),
            '@exodra/react-mount': aliasPath(
                './packages/react-mount/src/index.ts'
            ),
            // Test helpers only — a private package that is never built and never
            // published, so this alias is the ONLY way it is ever resolved.
            '@exodra/test-utils': aliasPath(
                './packages/test-utils/src/index.ts'
            ),
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
        exclude: [...configDefaults.exclude, '**/dist/**', 'packages/react-compat-libraries/**'],
        coverage: {
            // Only what ships. Build output, the benchmark harness, generators
            // and the docs site would each move the number without saying
            // anything about the code people install.
            include: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
            // THE FIVE PRIVATE PACKAGES, and the list is the whole set — `private: true` in every
            // one of their manifests. Nobody installs them, so their lines in the numerator say
            // nothing about the code people run. Dropping only two of the five, which is what
            // stood here, made the figure a mix of shipped and unshipped code under a heading
            // that claimed otherwise.
            exclude: [
                '**/*.test.*',
                '**/*.d.ts',
                '**/dist/**',
                'packages/benchmarks/**',
                'packages/conformance/**',
                'packages/term/**',
                'packages/test-utils/**',
                'packages/type-tests/**',
            ],
            reporter: ['text', 'html'],
        },
    },
});

