// A constant and not a generated id, because the direct strategy's setter and its shared listener
// are built in two different files that must agree on the name, and there is only ever one of it.
// A pack outside this package that reuses `attachExoDirectEvent` therefore shares these slots.
export const EXO_DIRECT_PACK_ID = 'direct';
