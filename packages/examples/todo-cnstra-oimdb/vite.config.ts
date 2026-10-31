import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const at = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const EXODRA_ROOT = at('../../../');
const OIMDB_ROOT = at('../../../../oimdb/');
const CNSTRA_ROOT = at('../../../../cnstra/');

export default defineConfig({
    resolve: {
        alias: {
            '@exodra/context': at('../../context/src/index.ts'),
            '@exodra/core': at('../../core/src/index.ts'),
            '@exodra/computed': at('../../computed/src/index.ts'),
            '@exodra/list-reconcile': at('../../list-reconcile/src/index.ts'),
            '@exodra/dom': at('../../dom/src/index.ts'),
            '@exodra/forms': at('../../forms/src/index.ts'),
            '@oimdb/core': at('../../../../oimdb/packages/core/src/index.ts'),
            '@cnstra/core': at('../../../../cnstra/packages/core/src/index.ts'),
            '@cnstra/types': at('../../../../cnstra/packages/types/src/index.ts'),
        },
    },
    server: {
        fs: {
            allow: [EXODRA_ROOT, OIMDB_ROOT, CNSTRA_ROOT],
        },
    },
});
