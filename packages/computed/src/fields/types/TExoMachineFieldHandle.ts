import type { TExoMachineField } from './TExoMachineField';

/**
 * `set` IS THE STORE AND THE MARK IN ONE CALL: there is no place to write them apart, so no body
 * can write one field and mark another. METHODS AND NOT PROPERTIES, so `Handle<string>` is
 * assignable to `Handle<unknown>` — which is exactly what a mixed dependency list needs.
 */
export interface TExoMachineFieldHandle<TOf, TValue> extends TExoMachineField<TOf, TValue> {
    get(enode: TOf): TValue;
    set(enode: TOf, value: TValue): void;
}
