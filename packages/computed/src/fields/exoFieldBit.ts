import { EXO_MACHINE_LIMIT } from '../transitions/constants/EXO_MACHINE_LIMIT';

/**
 * A checked spelling of `1 << index`, so the ceiling is refused where the number is WRITTEN rather
 * than at the first commit that quietly ran the wrong derivation: `1 << 31` is negative and
 * `1 << 32` is `1`, so a component past the cap gets a bit belonging to another field.
 */
export function exoFieldBit(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= EXO_MACHINE_LIMIT) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `exoFieldBit: field ${index}; fields are numbered ` +
                  `0..${EXO_MACHINE_LIMIT - 1}.`
                : 'EXO0082'
        );
    }
    return 1 << index;
}
