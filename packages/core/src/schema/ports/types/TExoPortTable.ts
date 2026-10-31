/**
 * AN OPAQUE TOKEN: a spelled-out array type would let a caller INDEX it, and the index MEANING is
 * exactly what differs between backends. No backend marker — that would infect every STATE TYPE.
 */
declare const EXO_PORT_TABLE: unique symbol;

export type TExoPortTable = {
    readonly [EXO_PORT_TABLE]: unknown;
};
