import { defineConfig } from 'tsup';

export default defineConfig([
    {
        // The library and the CLI: Node, external dependencies left alone.
        entry: ['src/index.ts', 'src/cli.ts', 'src/bin.ts'],
        format: ['esm'],
        dts: false,
        clean: true,
        outDir: 'dist',
        target: 'node18',
        platform: 'node',
        external: ['dependency-cruiser', '@dagrejs/dagre'],
    },
    {
        // The browser runtime: ONE file, everything inlined. A host project
        // drops it next to the data and points a <script> at it — no bundler of
        // its own has to know about Exodra.
        entry: { graph: 'src/graph.ts' },
        format: ['esm'],
        dts: false,
        clean: false,
        outDir: 'dist',
        target: 'es2020',
        platform: 'browser',
        minify: true,
        noExternal: [/.*/],
    },
]);
