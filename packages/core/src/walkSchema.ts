// Base bookkeeping every walked node carries.
interface TExoWalkNodeBase<TSchema> {
    readonly schema: TSchema;
    // visit() sets this: children schemas to descend into. Leave unset (undefined)
    // for leaves — no empty array required.
    children: readonly TSchema[] | undefined;
}

/**
 * The node passed to visit(). It is the traversal frame itself: base bookkeeping
 * PLUS the context slots (TContext) the visitor fills in place. Children read
 * their parent's filled-in context via `node.parent`. Keeping context INLINE on
 * the node means the walk allocates nothing per node beyond the frame — no
 * separate `{...}` context object and no `{context, children}` return wrapper.
 */
export type TExoWalkNode<TSchema, TContext> = TExoWalkNodeBase<TSchema> &
    Partial<TContext> & {
        readonly parent: TExoWalkNode<TSchema, TContext> | undefined;
    };

/**
 * Pure, iterative, depth-first schema traversal. Visits each node parent-first.
 * It does NOT create ExoNode instances — the visitor owns per-node processing,
 * writing the context its children receive onto the node in place. Returns the
 * root node.
 *
 * `createNode` is supplied by the caller and MUST return the node with ALL its
 * context slots already present (initialised to undefined). This matters for V8:
 * a node born with every slot keeps its properties in-object, so the visitor's
 * writes hit existing slots. If the visitor instead ADDED context properties to a
 * smaller node, V8 would grow it past its in-object capacity into a backing store
 * (plus a hidden-class transition per add) — measured ~11% slower on a 1200-node
 * build. The factory lives in the caller so core stays generic (it never names
 * the context fields).
 */
export function walkSchema<TSchema, TContext>(
    root: TSchema,
    visit: (node: TExoWalkNode<TSchema, TContext>) => void,
    createNode: (
        schema: TSchema,
        parent: TExoWalkNode<TSchema, TContext> | undefined
    ) => TExoWalkNode<TSchema, TContext>
): TExoWalkNode<TSchema, TContext> {
    type Node = TExoWalkNode<TSchema, TContext>;

    const rootNode = createNode(root, undefined);
    const stack: Node[] = [rootNode];

    while (stack.length > 0) {
        const node = stack.pop()!;
        visit(node);

        const children = node.children;
        if (children) {
            // Push in reverse so children pop in order and sit above this node.
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push(createNode(children[i], node));
            }
        }
    }

    return rootNode;
}
