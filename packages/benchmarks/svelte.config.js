import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    dev: false,
    // `dev: false` alone does NOT stop the HMR wrapper. The plugin's default is
    // `hmr: !isProduction && !isBuild && server.hmr !== false`
    // (node_modules/@sveltejs/vite-plugin-svelte/src/utils/options.js:204-209), and NOTHING we
    // set clears it on the dev server:
    //   • removeIgnoredOptions() ignores only generate/format/filename (options.js:274);
    //   • enforceOptionsForHmr() clears hmr only when vite `server.hmr === false` (options.js:242),
    //     and our server block sets port/open only;
    //   • enforceOptionsForProduction() clears it only when `isProduction` (options.js:254), which
    //     Vite computes from NODE_ENV in the NODE process — vite.config.ts sets NODE_ENV as a
    //     `define`, a client-side string replacement the Node process never sees.
    // With hmr on, svelte 5 emits `if (import.meta.hot) { App = $.hmr(App); … }` around every
    // component (svelte/src/compiler/phases/3-transform/client/transform-client.js:512-529) AND
    // disables the `is_standalone` markup optimisation, so `{#if x}<Foo/>{/if}` gains anchor
    // comments it would not otherwise carry
    // (svelte/src/compiler/phases/3-transform/utils.js:285-293).
    // svelte's own compilerOptions doc for this flag: "If `true`, compiles components with hot
    // reloading support. @default false" (svelte/types/index.d.ts:1145-1149) — and the plugin's
    // deprecation note names it as THE lever: "Enable or disable Hot Module Replacement.
    // Deprecated, use compilerOptions.hmr instead!" (plugin public.d.ts:40-41).
    hmr: false,
  },
};







