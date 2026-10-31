import { exoFieldBit } from './exoFieldBit';
import type { TExoMachineField } from './types/TExoMachineField';

export function exoMachineField<TState, TValue>(
    index: number,
    read: (enode: TState) => TValue,
    write?: (enode: TState, value: TValue) => void
): TExoMachineField<TState, TValue> {
    return {
        address: index,
        bit: exoFieldBit(index),
        // NO SLOT, AND THAT IS THE WHOLE OF THIS FORM: the state is the AUTHOR'S OWN OBJECT and the reader
        // is theirs, so there is no `values` to index and `-1` is what says so.
        row: -1,
        read: read,
        // SOUND BY CONSTRUCTION: the only value ever passed to this writer is the result of a derivation
        // whose ADDRESS is this field.
        write:
            write === undefined
                ? null
                : (write as unknown as (enode: TState, value: unknown) => void),
    };
}
