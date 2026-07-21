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
                // fetch / URL family (browser + node 18+)
                fetch: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                Headers: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                // node
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
            'prefer-const': 'error',
            'no-var': 'error',
            // The base rule false-fires on TypeScript function overloads and
            // type/value declaration merging; tsc already catches real
            // redeclarations (TS2451).
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
            // Private, non-published benchmark harness — intentionally uses
            // bare JSX expression statements for measurement; not part of the
            // publishable surface, so keep it out of the release lint gate.
            'packages/benchmarks/**',
            // Compile-only type tests: declare values used only in type
            // positions and rely on @ts-expect-error, which trips lint rules by
            // design. Checked by `npm run test:types` (tsc), not eslint.
            'packages/type-tests/**',
        ],
    },
    // Allow 'any' types in integration files that interface with external APIs
    {
        files: ['**/integrations/**/*.ts', '**/integrations/**/*.tsx'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn', // Allow but warn in integrations
        },
    },
];