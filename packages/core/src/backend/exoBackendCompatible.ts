import type { TExoBackendCompatible } from './types/TExoBackendCompatible';
import type { TExoBackendType } from './types/TExoBackendType';

export function exoBackendCompatible<
    TTypes extends Readonly<Record<string, TExoBackendType<object>>>,
    TDoor extends string,
    TValue extends TExoBackendCompatible<TTypes, TDoor>
>(_types: TTypes, _door: TDoor, value: TValue): TValue {
    return value;
}
