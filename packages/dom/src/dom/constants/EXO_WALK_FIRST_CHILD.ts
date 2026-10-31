// Each triple of the walk is ONE pointer dereference, never "descend and skip n": a count would put
// a loop with a varying trip count inside the replay, and the hops are decided at compile time
// where an extra one costs nothing. Plain constants and not an enum — this is compared inside the
// replay loop and must erase to numbers.
export const EXO_WALK_FIRST_CHILD = 0;
