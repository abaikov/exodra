import { describe, expect, it, vi } from 'vitest';
import { walkSchema, type TExoWalkNode } from './walkSchema';

// A tiny test schema: an id + optional children. The visitor descends into `kids`.
interface Node {
    id: string;
    kids?: Node[];
}
// Context the visitor threads onto each frame (mirrors how the DOM build threads
// element/scope). Here just a `depth` so we can prove parent context is readable.
interface Ctx {
    depth: number;
}
type Frame = TExoWalkNode<Node, Ctx>;

// A createNode that births the frame with EVERY slot present (base + context),
// exactly as the real callers must.
const makeFrame = (schema: Node, parent: Frame | undefined): Frame =>
    ({ schema, parent, children: undefined, depth: undefined }) as unknown as Frame;

// A visit that records order and sets children + a threaded depth.
function record() {
    const order: string[] = [];
    const parents: Record<string, string | undefined> = {};
    const depths: Record<string, number> = {};
    const visit = (node: Frame): void => {
        order.push(node.schema.id);
        parents[node.schema.id] = node.parent?.schema.id;
        node.depth = (node.parent?.depth ?? -1) + 1; // read parent ctx, write own
        depths[node.schema.id] = node.depth;
        node.children = node.schema.kids;
    };
    return { order, parents, depths, visit };
}

describe('walkSchema', () => {
    it('visits a single node and returns its frame', () => {
        const { order, visit } = record();
        const create = vi.fn(makeFrame);
        const root = walkSchema<Node, Ctx>({ id: 'a' }, visit, create);
        expect(order).toEqual(['a']);
        expect(root.schema.id).toBe('a');
        expect(root.parent).toBeUndefined();
        expect(create).toHaveBeenCalledTimes(1);
    });

    it('descends parent-first (pre-order DFS), children left-to-right', () => {
        //        a
        //      /   \
        //     b     c
        //    / \     \
        //   d   e     f
        const tree: Node = {
            id: 'a',
            kids: [
                { id: 'b', kids: [{ id: 'd' }, { id: 'e' }] },
                { id: 'c', kids: [{ id: 'f' }] },
            ],
        };
        const { order, parents, visit } = record();
        walkSchema<Node, Ctx>(tree, visit, makeFrame);
        expect(order).toEqual(['a', 'b', 'd', 'e', 'c', 'f']);
        expect(parents).toEqual({
            a: undefined,
            b: 'a',
            d: 'b',
            e: 'b',
            c: 'a',
            f: 'c',
        });
    });

    it('does not descend a leaf (children left unset)', () => {
        const { order, visit } = record();
        walkSchema<Node, Ctx>({ id: 'solo' }, visit, makeFrame);
        expect(order).toEqual(['solo']);
    });

    it('calls createNode once per node, with the right schema and parent', () => {
        // NOTE: children are created in REVERSE order (pushed reversed so they pop
        // in order), so we assert the mapping, not the creation order.
        const parentOf = new Map<string, string | undefined>();
        let calls = 0;
        const create = (schema: Node, parent: Frame | undefined): Frame => {
            calls++;
            parentOf.set(schema.id, parent?.schema.id);
            return makeFrame(schema, parent);
        };
        const { visit } = record();
        walkSchema<Node, Ctx>(
            { id: 'a', kids: [{ id: 'b' }, { id: 'c' }] },
            visit,
            create
        );
        expect(calls).toBe(3); // once per node
        expect(Object.fromEntries(parentOf)).toEqual({
            a: undefined,
            b: 'a',
            c: 'a',
        });
    });

    it('threads context: a child reads the parent frame the visitor filled', () => {
        const { depths, visit } = record();
        walkSchema<Node, Ctx>(
            { id: 'a', kids: [{ id: 'b', kids: [{ id: 'c' }] }] },
            visit,
            makeFrame
        );
        // depth is derived from parent.depth → proves node.parent carries the
        // context the visitor wrote in place.
        expect(depths).toEqual({ a: 0, b: 1, c: 2 });
    });

    it('handles an empty children array (no descent, no error)', () => {
        const { order, visit } = record();
        walkSchema<Node, Ctx>({ id: 'a', kids: [] }, visit, makeFrame);
        expect(order).toEqual(['a']);
    });

    it('the returned root frame carries the visitor-written children', () => {
        const visit = (node: Frame): void => {
            node.children = node.schema.kids;
        };
        const root = walkSchema<Node, Ctx>(
            { id: 'a', kids: [{ id: 'b' }] },
            visit,
            makeFrame
        );
        expect(root.children).toEqual([{ id: 'b' }]);
    });
});
