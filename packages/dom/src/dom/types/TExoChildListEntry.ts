/** `Node` and not `Element`: the only things read off an entry are its position and its
 *  `nextSibling`. A fixed `list` publishes one entry and no child. */
export type TExoChildListEntry = {
    readonly node: Node;
};
