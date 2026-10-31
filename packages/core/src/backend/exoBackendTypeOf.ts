import type { TExoBackendType } from './types/TExoBackendType';

export function exoBackendTypeOf<TApi extends { readonly backendType: number }>(
    backend: TApi
): TExoBackendType<TApi> {
    return backend.backendType as TExoBackendType<TApi>;
}
