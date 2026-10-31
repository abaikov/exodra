// One record per root per pack, REFERENCE COUNTED: two renders into the same parent would otherwise
// put two `click` listeners on that root and run every handler twice — a toggle that flips and
// flips back, which looks like nothing happened and points at the handler, not the install.
export type TExoDelegatedRoot = {
    liveRenders: number;
    // Built once, at the install that created the record, so two teardowns end the same thing in
    // either order. Called exactly once, at the last release.
    readonly off: () => void;
};
