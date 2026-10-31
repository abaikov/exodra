// The instance record a machine was just armed on, for `c.one` to hand back. A slot and not a
// return value because `mountExoInstance` already returns what its callers need, and threading a
// second value out costs a pair per row to carry `undefined` for nearly every machine.
// Sound only because of ORDER: nested wires complete before the outer one writes, a throwing wire
// writes nothing, and `mountExoInstance`/`hydrateExoInstance` save this into a local across the
// insertion and the `mounted` commit — both of which can run user code that wires.
// Deliberately NOT cleared on read: the next wire overwrites it, and the retention is one value.
export const EXO_ARMED_INSTANCE: { value: unknown } = { value: undefined };
