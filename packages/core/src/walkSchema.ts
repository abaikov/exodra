export interface TExoWalkResult<TContext, TSchema> {
    // Context passed to this node's children (e.g. the DOM element they attach to).
    context: TContext;
    // Children schemas to walk under this node. Omit/empty for leaves.
    children?: readonly TSchema[];
}

/**
 * Pure, iterative, depth-first schema traversal. Visits each node parent-first
 * and (optionally) runs an exit pass child-first. It does NOT create ExoNode
 * instances — the visitor owns per-node processing and returns the context its
 * children receive. This lets a single-node renderer (the WeakMap DOM impl) and
 * the per-node renderers share one walk instead of each rolling their own.
 *
 * Returns the root node's context.
 */
export function walkSchema<TSchema, TContext>(
    root: TSchema,
    visit: (
        schema: TSchema,
        parent: TContext | undefined,
        index: number
    ) => TExoWalkResult<TContext, TSchema>,
    exit?: (schema: TSchema, context: TContext) => void
): TContext {
    interface Frame {
        schema: TSchema;
        parent: TContext | undefined;
        index: number;
        entered: boolean;
        context?: TContext;
    }

    const stack: Frame[] = [
        { schema: root, parent: undefined, index: 0, entered: false },
    ];
    let rootContext: TContext | undefined;
    let rootSet = false;

    while (stack.length > 0) {
        const frame = stack.pop()!;

        if (frame.entered) {
            exit!(frame.schema, frame.context as TContext);
            continue;
        }

        const { context, children } = visit(
            frame.schema,
            frame.parent,
            frame.index
        );
        if (!rootSet) {
            rootContext = context;
            rootSet = true;
        }

        // Re-push this frame (as entered) so its exit runs after all descendants.
        if (exit) {
            frame.entered = true;
            frame.context = context;
            stack.push(frame);
        }

        if (children) {
            // Push in reverse so children pop in order and sit above this frame.
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push({
                    schema: children[i],
                    parent: context,
                    index: i,
                    entered: false,
                });
            }
        }
    }

    return rootContext as TContext;
}
