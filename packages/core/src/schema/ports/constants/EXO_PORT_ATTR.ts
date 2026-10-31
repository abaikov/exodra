/**
 * THEY CANNOT BE RENUMBERED: all four are exported so a separately-built plugin can compile its own
 * schema. Zero is the falsy one, so `if (port.kind)` is false for every attribute port.
 */
export const EXO_PORT_ATTR = 0;
