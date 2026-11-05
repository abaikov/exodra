export function refuseExoSecondWire(): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'withExoWire: this machine already has a wire; a machine has one wire.'
            : 'EXO0101'
    );
}
