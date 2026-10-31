// The node table of an instance with no slots to resolve, shared by the whole process. Safe because
// every line that indexes a node table is reached through a PORT, and a schema whose `setters` is
// empty has no port of any kind; and because the two loops that WRITE a node table are gated first
// (`wireExoInstance` on `walk.length === 0`, `hydrateExoInstance` on `schema.slots === 1`).
// A shared array and not `null`, so no reader has to learn a second shape for a field thirteen hot
// lines load. In a module of its own so hydration does not import the render's hot module.
export const EXO_EMPTY_NODES: Node[] = [];
