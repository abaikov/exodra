import type { TExoTermElement } from '../../instance/types/TExoTermElement';
import type { TExoTermTextOptions } from '../../instance/exoTermText';

// `dispose` HAS NO COUNTERPART IN THE EXPORTED SURFACE: `@exodra/core` has no notion of a mounted
// root, a lifetime or an unsubscribe, so every backend decides for itself what "end this" means.
export type TExoTermScreen = {
    // One per instance rendered. `backend.renderScreen(c, 3)` has three.
    readonly roots: readonly TExoTermElement[];
    text(options?: TExoTermTextOptions): string;
    // End every subscription in every instance, recursively. Safe to call twice.
    dispose(): void;
};
