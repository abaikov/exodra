import type { TExoDomApi } from '../dom/types/TExoDomApi';
import type { TExoDomRecordFactories } from '../dom/types/TExoDomRecordFactories';

// The surface cannot currently be absent — every route into `compileExoHydrateSchema` stands on a
// backend that composed it — but `__proto__: undefined` in an object literal is LEGAL and SILENT,
// so without this the first `c.set` of an adopted page is a `TypeError` on a method name thrown
// from a compiled wire, saying nothing about hydration or composition.
// It answers `TExoDomRecordFactories` and not `object` because two names are read off it; the adopting
// BODIES stay unnamed, so no client-only bundle gains an edge into `hydrate/`.
export function requireExoHydrateSurface(backend: TExoDomApi): TExoDomRecordFactories {
    const surface = backend.hydrateSurface;
    if (surface === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'Exodra: this backend cannot hydrate — it was not composed with withExoHydration(). ' +
                  'Compose it once, at module level: `const backend = withExoHydration(new ExoDomBackend())`, ' +
                  'and render from the same object you hydrate with.'
                : 'EXO0030'
        );
    }
    return surface;
}
