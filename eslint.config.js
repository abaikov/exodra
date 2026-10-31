import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
    eslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                console: 'readonly',
                document: 'readonly',
                window: 'readonly',
                performance: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                HTMLElement: 'readonly',
                HTMLInputElement: 'readonly',
                HTMLSelectElement: 'readonly',
                HTMLTextAreaElement: 'readonly',
                HTMLButtonElement: 'readonly',
                Element: 'readonly',
                Text: 'readonly',
                Node: 'readonly',
                Comment: 'readonly',
                DocumentFragment: 'readonly',
                Window: 'readonly',
                Event: 'readonly',
                CustomEvent: 'readonly',
                KeyboardEvent: 'readonly',
                MouseEvent: 'readonly',
                FocusEvent: 'readonly',
                SubmitEvent: 'readonly',
                DragEvent: 'readonly',
                WheelEvent: 'readonly',
                PointerEvent: 'readonly',
                TouchEvent: 'readonly',
                PopStateEvent: 'readonly',
                EventListener: 'readonly',
                ChildNode: 'readonly',
                HTMLDivElement: 'readonly',
                HTMLAnchorElement: 'readonly',
                localStorage: 'readonly',
                location: 'readonly',
                history: 'readonly',
                navigator: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                queueMicrotask: 'readonly',
                fetch: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                Headers: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                global: 'readonly',
                globalThis: 'readonly',
                module: 'readonly',
                require: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                NodeJS: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            // OFF for TypeScript on typescript-eslint's own recommendation: `no-undef` cannot see
            // type declarations, so every DOM *type* looks undefined to it — which is why the
            // globals list above kept growing. tsc already errors on a genuinely undefined name.
            'no-undef': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrors: 'none',
                },
            ],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            // ONLY EXPORTED DECLARATIONS ARE CHECKED, and that is the point: the prefix is what
            // tells a READER OF ANOTHER PACKAGE that a name is ours, so a file-local `Row` is fine.
            // `format: null` turns the built-in casing check off deliberately — the `custom` regex
            // pins the head of the name and the tail is the author's. FUNCTIONS ARE NOT COVERED:
            // their convention (verb + `Exo` + noun) has no regex that does not either pass
            // everything or fail `jsx`, `h` and every callback factory here. It stays a review
            // matter. Rationale: docs-site/docs/architecture/gates-and-root-configs.md
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: ['interface', 'typeAlias'],
                    modifiers: ['exported'],
                    format: null,
                    // THE NAMES TYPESCRIPT OWNS: inside `namespace JSX` the compiler looks these
                    // up BY NAME, so renaming one does not rename a convention — it turns JSX
                    // type-checking off. On the rule, not on `@exodra/jsx`, which declares them.
                    filter: {
                        regex:
                            '^(Element|ElementType|ElementClass|ElementAttributesProperty|' +
                            'ElementChildrenAttribute|IntrinsicAttributes|' +
                            'IntrinsicClassAttributes|IntrinsicElements|' +
                            'LibraryManagedAttributes)$',
                        match: false,
                    },
                    custom: { regex: '^TExo[A-Z]', match: true },
                },
                {
                    selector: 'class',
                    modifiers: ['exported'],
                    format: null,
                    custom: { regex: '^Exo[A-Z]', match: true },
                },
                {
                    selector: 'enum',
                    modifiers: ['exported'],
                    format: null,
                    custom: { regex: '^EExo[A-Z]', match: true },
                },
                // ONLY SCREAMING_SNAKE NAMES ARE CHECKED — the only population the repo has a
                // convention for, since its camelCase exported consts are mostly arrow functions
                // with no `exo` head at all. AND IT IS WHY THERE IS NO `types: ['function']` HATCH:
                // to `naming-convention` a `const` holding an arrow function is a `variable`, and
                // the documented cure `types` needs TYPE INFORMATION, which this deliberately
                // program-less parser cannot give — asking would not narrow the rule, it would make
                // it throw on every file. The name-shape `filter` separates them with no type
                // checker. It therefore misses an unbranded camel/Pascal constant, accepted
                // because every constant the repo has written is SCREAMING_SNAKE.
                {
                    selector: 'variable',
                    modifiers: ['exported', 'const'],
                    format: null,
                    filter: {
                        regex: '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$',
                        match: true,
                    },
                    custom: { regex: '^EXO_[A-Z0-9]', match: true },
                },
            ],
            'prefer-const': 'error',
            'no-var': 'error',
            // The base rule false-fires on TS function overloads and type/value declaration
            // merging; tsc already catches a real redeclaration (TS2451).
            'no-redeclare': 'off',
        },
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
    },
    {
        ignores: [
            'node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/*.d.ts',
            // Benchmark harness: bare JSX expression statements, on purpose, for measurement.
            'packages/benchmarks/**',
            // Compile-only type tests: values in type positions and `@ts-expect-error` by design.
            // Gated by `npm run test:types` (tsc), not by eslint.
            'packages/type-tests/**',
            // VERBATIM COPIES OF README.md, compared to it byte for byte by
            // `packages/term/src/tests/readme-verbatim.test.ts`. Renaming their unbranded exports to
            // satisfy the rule above would break that comparison. Still TYPE-checked, via
            // `tsconfig.build.json`.
            'packages/term/src/doc/**',
        ],
    },
    // Files that interface with external APIs, where the shape is not ours to type.
    {
        files: ['**/integrations/**/*.ts', '**/integrations/**/*.tsx'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    // AN EXAMPLE APP'S NAMES ARE THE APP'S, NOT THIS LIBRARY'S: an app calling its root component
    // `APP` is not a name the prefix rule has any business policing.
    {
        files: ['packages/examples/**/*.ts', 'packages/examples/**/*.tsx'],
        rules: {
            '@typescript-eslint/naming-convention': 'off',
        },
    },
    // A TEST FIXTURE IS NOT PUBLIC API: `class Shape` in a profiling test is a prop in a scene,
    // exported only so the fixture can be shared between cases.
    {
        files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts', '**/tests/**/*.ts'],
        rules: {
            '@typescript-eslint/naming-convention': 'off',
        },
    },
    // ==================================================== TEMPORARY EXEMPTIONS: COUNTED DEBT
    // One package per block, with its violation count, because an override with no expiry
    // condition is just the rule turned off. DELETE A BLOCK the moment its package is renamed.
    //
    // jsx: 26 type aliases that are `Exo`-prefixed where the convention asks for `TExo`. NOT the
    // names TypeScript owns — those are exempt on the rule itself, above.
    {
        files: ['packages/jsx/**/*.ts'],
        rules: {
            '@typescript-eslint/naming-convention': 'off',
        },
    },
    // The build-tool packages: 8 names between them, all spelling `Exodra` in full as the head.
    {
        files: [
            'packages/babel-preset-exodra/**/*.ts',
            'packages/bun-plugin-exodra/**/*.ts',
            'packages/esbuild-plugin-exodra/**/*.ts',
            'packages/rollup-plugin-exodra/**/*.ts',
        ],
        rules: {
            '@typescript-eslint/naming-convention': 'off',
        },
    },
];