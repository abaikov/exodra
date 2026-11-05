export function refuseExoFixedPortChildren(): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'This children port was filled by c.one or c.list, which own their port: place children ' +
              'there with createExoNode and appendChild / insertChild (or a reconciler) instead, or use ' +
              'a separate children port for the hand-placed ones.'
            : 'EXO0114'
    );
}
