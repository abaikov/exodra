// Hydration only: `from.lastChild`, then `op - EXO_WALK_FROM_END` steps back along
// `previousSibling`. A child list is EMPTY in a clone and FULL on the page, so a landing behind one
// counts from the END, where the node count is a fact about the schema. Exact only while no OTHER
// child list stands behind the landing, which is the condition `compileExoDomSchema` emits it under.
// The hop count rides IN the op — the one operand in this design — because the number of steps is
// not known until the parent's whole child list has been walked.
export const EXO_WALK_FROM_END = 2;
