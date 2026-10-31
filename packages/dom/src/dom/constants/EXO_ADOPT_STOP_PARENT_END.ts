// The non-slot values of `adoptStopSlot[port]`, which answers ADOPTION's question only: which node
// the markup of this child list stops AT. A render asks `childListEndSlot` instead.
// UNKNOWN is the honest answer for a child list with ANOTHER child list behind it: no compile-time
// table can say where one's rows end, and this backend prints no marker. Adoption is then given no
// boundary at all — it must never be given a WRONG one, since every use either stops a loop or
// removes nodes. In `<h3/>{a}<hr/>{b}<footer/>` it is `a` that is told UNKNOWN, not `b`.
export const EXO_ADOPT_STOP_PARENT_END = -1;
