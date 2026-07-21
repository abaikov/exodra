import { defineConfig, type Plugin } from 'vite';
import * as babel from '@babel/core';
import exodraJsx from '@exodra/babel-plugin-jsx';

// Transform .tsx/.jsx via @exodra/babel-plugin-jsx (the engine's JSX compiler:
// JSX -> h() with static/bindables/bindableLists buckets). Runs in every vite
// path — client build, dev SSR (ssrLoadModule), prod SSR build — and via
// vite-node for the view-level smoke test.
function exodraJsxPlugin(): Plugin {
    return {
        name: 'exodra-jsx',
        enforce: 'pre',
        transform(code, id) {
            if (!/\.[jt]sx$/.test(id) || id.includes('node_modules')) return;
            const result = babel.transformSync(code, {
                filename: id,
                sourceMaps: true,
                babelrc: false,
                configFile: false,
                presets: [
                    ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
                ],
                plugins: [['@babel/plugin-syntax-jsx'], exodraJsx],
            });
            if (!result?.code) return undefined;
            return { code: result.code, map: result.map ?? undefined };
        },
    };
}

export default defineConfig({
    appType: 'custom',
    build: { emptyOutDir: false },
    plugins: [exodraJsxPlugin()],
});
