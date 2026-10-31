import type { TExoCompilerApi, TExoDomBackend, TExoHydrationApi } from '@exodra/dom';

export type TExoMountOptions<TParams = unknown> = {
    hydrate?: boolean;
    deps?: readonly unknown[];
    params?: TParams;
    // THE COMPILER PACK IS REQUIRED and hydration is not, and the difference is what each one is
    // for: this hook is handed a COMPONENT, which carries a declaration, so the backend it renders
    // through has to be able to compile one — a bare `new ExoDomBackend()` cannot and the type says
    // so. `adoptRoot` stays Partial because a backend can genuinely lack that plugin.
    backend?: TExoDomBackend & TExoCompilerApi & Partial<Pick<TExoHydrationApi, 'adoptRoot'>>;
};
