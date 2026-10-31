import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  splitting: false,
  treeshake: false,
  // No minification here, so function names survive anyway — `keepNames` only added esbuild
  // `__name` wrappers as pure overhead in the shipped dist. `dist/index.js` has none, but the
  // two files EVERY compiled app imports do: `jsx-runtime` and `jsx-dev-runtime` each carry one
  // wrapper, ~181 raw / 76-79 gzip bytes per ESM file and 34-35 gzip per CJS file. It is emitted
  // as a bare unannotated top-level call in the smallest module this package ships.
  keepNames: false,
  tsconfig: 'tsconfig.tsup.json',
});
