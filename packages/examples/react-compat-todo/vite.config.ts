import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import exodraReact from '../../babel-plugin-exodra-schema/src/react/index';

const at = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

function exodraReactJsx(): Plugin {
    return {
        name: 'exodra-react-jsx',
        enforce: 'pre',
        transform(code, id) {
            if (!id.endsWith('.jsx')) return null;
            const out = transformSync(code, {
                filename: id,
                babelrc: false,
                configFile: false,
                sourceMaps: true,
                plugins: ['@babel/plugin-syntax-jsx', exodraReact],
            });
            return out === null ? null : { code: out.code ?? '', map: out.map };
        },
    };
}

export default defineConfig({
    plugins: [exodraReactJsx()],
    esbuild: { jsx: 'preserve' },
    resolve: {
        alias: [
            { find: /^react$/, replacement: at('../../react-compat/src/index.ts') },
            { find: /^react-dom\/client$/, replacement: at('../../react-compat/src/client.ts') },
            { find: '@exodra/react-compat/jsx-runtime', replacement: at('../../react-compat/src/jsx-runtime.ts') },
            { find: '@exodra/react-compat/names', replacement: at('../../react-compat/src/names.ts') },
            { find: '@exodra/react-compat', replacement: at('../../react-compat/src/index.ts') },
            { find: '@exodra/context', replacement: at('../../context/src/index.ts') },
            { find: '@exodra/core', replacement: at('../../core/src/index.ts') },
            { find: '@exodra/computed', replacement: at('../../computed/src/index.ts') },
            { find: '@exodra/list-reconcile', replacement: at('../../list-reconcile/src/index.ts') },
            { find: '@exodra/dom', replacement: at('../../dom/src/index.ts') },
        ],
    },
    server: { fs: { allow: [at('../../../')] } },
});
