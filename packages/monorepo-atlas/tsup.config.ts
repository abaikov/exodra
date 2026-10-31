import { defineConfig } from 'tsup';

export default defineConfig([
    {
        // The library and the CLI: Node, external dependencies left alone.
        entry: ['src/index.ts', 'src/cli.ts', 'src/bin.ts'],
        format: ['esm'],
        // ON, because `package.json` PROMISES it: both `types` and `exports["."].types` point at
        // `dist/index.d.ts`, and the publish guard only checks that `dist` exists — so with this
        // off the package shipped a types path that resolved to nothing and every consumer got
        // `any`. The browser bundle below keeps `dts: false`: it is a page, not an API.
// OFF here on purpose: tsup drives its own file list into the declaration compiler, which
        // makes every transitively-imported module a TS6307 "not listed within the file list of
        // project". Declarations are emitted by a plain `tsc -p tsconfig.dts.json` in the build
        // script instead — see `package.json`. They ARE emitted; `package.json` promises them.
        dts: false,
        clean: true,
        outDir: 'dist',
        target: 'node18',
        platform: 'node',
        external: ['dependency-cruiser', '@dagrejs/dagre'],
    },
    // THE BROWSER RUNTIME BUNDLE IS GONE with the view it bundled (`src/graph.ts`, the explorer
    // and everything it mounted). It was written against the three-props renderer, which has
    // been deleted; a view re-authored on the schema core brings this entry back with it.
]);
