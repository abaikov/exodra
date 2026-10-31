import { createRequire } from 'node:module';
import { describe } from 'vitest';

// The exact specifier the three bundler plugins `require()` at runtime; the package root or the
// source would answer a different question from the one the plugin asks.
const PRESET_ENTRY = 'babel-preset-exodra/dist/index.cjs';

// Neither this alias nor the return type below may become `typeof describe` or be left to
// inference: reducing that union has no fixed point, and `npm run atlas` died in it. See README.
type TExoDescribeLike = (name: string, fn: () => void) => void;

// `fromUrl` must be the CALLER's `import.meta.url` — `require()` resolves relative to its owner.
export const describeIfPresetBuilt = (fromUrl: string): TExoDescribeLike => {
    const requireFrom = createRequire(fromUrl);
    try {
        requireFrom(PRESET_ENTRY);
    } catch {
        console.warn(
            `[describeIfPresetBuilt] ${PRESET_ENTRY} is not built — skipping (run: npm run build --workspace=babel-preset-exodra)`
        );
        return describe.skip;
    }
    return describe;
};
