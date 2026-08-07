/**
 * ExoNodeDom — single-node DOM renderer. One node owns its whole subtree,
 * keyed off the schema objects, built via the core walkSchema traversal.
 */

import {
    injectFromScope,
    walkSchema,
    type TExoWalkNode,
    type TExoContext,
    type TExoNodeSchema,
    type TExoSchema,
    type TExoScope,
} from '@exodra/core';
import type {
    TExoBindable,
    TExoBindableList,
    TExoListOp,
    TExoNodeAttributes,
} from '@exodra/reactivity-types';
import { describeSchema } from './describeSchema';

// Component provide()/inject() scope, chained parent->child during the build walk
// (the single-node model has no per-node tree to carry context, so we thread it).
type TExoBuildScope = TExoScope;

interface TExoBuildContext {
    element: Element | Text | Comment | DocumentFragment;
    scope?: TExoBuildScope;
    /**
     * Whether children of this node belong to the SVG namespace. Carried down
     * the walk rather than read back off the DOM: `namespaceURI` is a property
     * load per node, this is a boolean already in hand.
     */
    svg?: boolean;
}

// The third parameter types the `exoRecord` slot as THIS renderer's record, so
// every read is plain property access instead of a cast at each site.
export type TExoNodeDomSchema = TExoNodeSchema<
    TExoSchema['type'],
    TDomAttributes,
    TExoNodeRecord
>;

// Lifecycle hooks receive the element they are attached to. In the single-node
// model the root passes `this` (an ExoNodeDom, which has `.element`); descendants
// pass a lightweight { element } handle.
export interface TExoDomMountTarget {
    element: Element | Text | Comment;
}

// The shared bucket skeleton, filled in with what is specific to a LIVE renderer:
// lifecycle hooks in the static bucket, list ops on reactive children (they drive
// the reconcile), and real DOM event handlers.
type TDomAttributes = TExoNodeAttributes<
    TExoNodeDomSchema,
    {
        onExoMount?: (node: TExoDomMountTarget) => void;
        onExoUnmount?: (node: TExoDomMountTarget) => void;
    },
    TExoListOp<TExoNodeDomSchema>,
    Record<string, (event: Event) => void>,
    Record<string, TExoBindable<(event: Event) => void, unknown>>
>;

// Per-schema bookkeeping, kept in ONE record on the schema's `exoRecord` slot
// (cheaper than 3-4 parallel structures). It always hangs off the ORIGINAL schema
// (what parents / this.schema reference);
// `lifecycle` points at the resolved element schema whose onExoMount/Unmount apply
// (differs from the key when the key is a component).
interface TExoNodeRecord {
    element?: Element | Text | Comment;
    children?: TExoNodeDomSchema[];
    disposers?: Array<() => void>;
    lifecycle?: TExoNodeDomSchema;
    // For a FRAGMENT with reactive children only: the fragment has no host
    // element, so its children live between two comment anchors in the parent and
    // are reconciled in that range on update. Set together or not at all.
    fragStart?: Comment;
    fragEnd?: Comment;
    // Ancestor provide()/inject() scope captured at build time for a host that
    // builds children DYNAMICALLY later (a reactive fragment, or an element with
    // reactive `children`). Reconciles read it so a child built on a later update
    // still resolves inject() up the real component chain — not a fresh empty one.
    scope?: TExoBuildScope;
}

const EMPTY_NUMS: readonly number[] = [];

/** Are children appended to this node SVG? One property load, per reconcile. */
const isSvgHost = (node: Node): boolean =>
    (node as Element).namespaceURI === SVG_NS &&
    (node as Element).tagName !== 'foreignObject';

// A reactive-children list reconciles by index, assuming each item maps to exactly
// ONE DOM node. A #fragment item spreads N sibling nodes, so the index math desyncs
// and silently corrupts positions. Reject it with a clear, actionable error (the
// fix is trivial: wrap the fragment in an element, or inline its children).
const FRAGMENT_LIST_ITEM_ERROR =
    'ExoNodeDom: a #fragment cannot be a direct item of a reactive children list — ' +
    'it spreads multiple DOM nodes, which the index-based list reconcile cannot ' +
    'track. Wrap it in an element (e.g. a <div>), or inline its children into the list.';

// getSequence (Vue-style): the indices of `arr` forming a LONGEST INCREASING
// subsequence, treating 0 as "new/not-reused" (skipped). A keyed reconcile keeps
// exactly this set of already-in-order nodes in place and moves only the rest — the
// MINIMAL number of DOM moves. (The naive "reposition everything out of place" pass
// did ~1.9× the moves on a shuffle — measured.)
function getSequence(arr: number[]): number[] {
    const p = arr.slice();
    const result: number[] = [0];
    const len = arr.length;
    let i: number, j: number, u: number, v: number, c: number;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) u = c + 1;
                else v = c;
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) p[i] = result[u - 1];
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

// A compiled template for a `cacheKey` subtree: the static skeleton (built once,
// cloned per occurrence) plus the child-index PATHS to its dynamic "holes" (nodes
// carrying bindables/handlers). `holes` is empty for a fully-static subtree — then
// an occurrence is a pure clone (the original behaviour). With holes, an occurrence
// is clone + patch: navigate each path in the clone AND in the occurrence's schema,
// then bind. Paths address both trees because a template's structure is invariant.
interface TExoTemplate {
    skeleton: Element;
    holes: number[][];
}

// Clone-cache for `cacheKey` subtrees: built once, then cloned (+ patched at holes)
// for every later occurrence sharing the key. Global, bounded by the number of
// distinct keyed templates in the app.
const cloneCache = new Map<symbol | string, TExoTemplate>();

// Node factory for the build walk. Creates the node with EVERY slot the visitor
// fills already present (element/scope), so those writes land in existing in-object
// slots. Growing the node instead (adding element/scope to a smaller object) spills
// it to an out-of-object property store + costs a hidden-class transition per add —
// measured ~11% slower on a 1200-node build. The factory lives here (not in core)
// so walkSchema stays generic and never names DOM context fields.
const createBuildNode = (
    schema: TExoNodeDomSchema,
    parent: TExoWalkNode<TExoNodeDomSchema, TExoBuildContext> | undefined
): TExoWalkNode<TExoNodeDomSchema, TExoBuildContext> =>
    ({
        schema,
        parent,
        children: undefined,
        element: undefined,
        scope: undefined,
        svg: undefined,
    }) as TExoWalkNode<TExoNodeDomSchema, TExoBuildContext>;

// SVG lives in its own namespace: an <svg> built with createElement is an
// unknown HTML element that renders nothing. The namespace is inherited by
// descendants, and `foreignObject` hands it back to HTML.
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Which namespace this ELEMENT belongs to. `<svg>` opens the subtree; everything
 * inside one stays in it — including `foreignObject`, which is itself an SVG
 * element even though its contents are HTML.
 */
function isSvgElement(type: string, parentIsSvg: boolean): boolean {
    return type === 'svg' || parentIsSvg;
}

/**
 * Which namespace this element's CHILDREN belong to. Same as the element's,
 * except `foreignObject` — that is the documented way back into HTML.
 */
function svgContextFor(type: string, parentIsSvg: boolean): boolean {
    if (type === 'foreignObject') return false;
    return isSvgElement(type, parentIsSvg);
}

// Identity createNode shared by every component context (schema IS the node in
// the single-node model).
const sharedCreateNode = (schema: unknown): unknown => schema;

// Wrap a primitive child (string/number) as a #text schema node.
const textSchema = (value: string | number): TExoNodeDomSchema =>
    ({
        type: '#text',
        attrs: { static: { textContent: String(value) } },
    }) as TExoNodeDomSchema;

// Standalone LIVE renderer — owns and mutates a real DOM subtree, patching it in
// place on reactive change. Does NOT share a base class with the string/snapshot
// renderer (they share only the renderer-agnostic core functions: walkSchema,
// component/children resolution). The single-node model (one instance per mount,
// records on the schema slot) is entirely its own.
export class ExoNodeDom {
    // The schema this node renders (root of its subtree).
    public readonly schema: TExoNodeDomSchema;

    /**
     * Static hydrate method for SSR
     */
    static hydrate(
        schema: TExoNodeDomSchema,
        element: Element | ChildNode
    ): ExoNodeDom {
        const node = new ExoNodeDom(schema, false);
        node.hydratedElement = element as Element | Text | Comment;
        node.init();
        return node;
    }

    // Per node: element + children + disposers + (resolved) lifecycle schema. Held
    // in a slot ON the schema (`exoRecord`, pre-created by h()), not in a WeakMap
    // keyed by it — a hash lookup on object identity costs ~3-4× a property load,
    // and the build path pays one lookup plus one insert per node. Lifetime is
    // unchanged: the record lived exactly as long as the schema either way.
    //
    // The cost is that a schema now belongs to ONE renderer. Rendering the same
    // schema object in two live positions was already forbidden (see the throw in
    // buildTree) — this extends that to two ExoNodeDom instances.

    // Schemas carrying an onExoMount, collected AS THEY ARE BUILT. commitMount used
    // to re-walk the whole tree (a stack + a record lookup + an attrs chain per node)
    // just to find the handful of nodes that have a hook; the build already holds
    // each schema, so it queues them instead and the commit is a flat drain. Also
    // fixes hooks under a STATIC #fragment, which the old walk could not reach (a
    // static fragment keeps its children on the walk node, not on a record).
    private pendingMounts: TExoNodeDomSchema[] = [];

    // The root node of this subtree. A DocumentFragment only when the root schema
    // is itself a fragment (no wrapper element).
    public element!: Element | Text | Comment | DocumentFragment;
    private hydratedElement?: Element | Text | Comment;

    constructor(schema: TExoNodeDomSchema, autoInit = true) {
        this.schema = schema;
        if (autoInit) {
            this.init();
        }
    }

    // No single-slot memo any more: it existed to collapse adjacent repeat lookups
    // into one WeakMap get, and a property load is already as cheap as the memo's
    // own identity check.
    /** @internal — the per-schema record, created on first use. */
    record(schema: TExoNodeDomSchema): TExoNodeRecord {
        let rec = schema.exoRecord;
        if (rec === undefined) schema.exoRecord = rec = {};
        return rec;
    }

    // Single-node model: this node owns its entire subtree (built in onInit via
    // walkSchema). Override the base init() so it does NOT also spin up a parallel
    // per-node child tree (which would double-build the DOM and double-subscribe).
    protected init(): void {
        this.onInit();
    }

    protected onInit(): void {
        if (this.hydratedElement) {
            this.element = this.hydratedElement;
            this.hydrateRoot(this.schema, this.hydratedElement);
            return;
        }
        this.element = this.buildTree(this.schema);
    }

    /**
     * Hydrate an existing SSR DOM tree against the schema. Unlike a fresh build,
     * we REUSE the server's nodes and only wire reactivity. The walk mirrors
     * buildTree's resolution — components are invoked (chaining a scope for
     * provide()/inject()), fragments are transparent — so bindings attach to the
     * right nodes. Children are matched by how many DOM nodes each schema child
     * OCCUPIES (0 for an empty component, 1 for an element/text, N for a fragment)
     * rather than 1:1, and adjacent text nodes (collapsed to one on parse) are
     * split back apart. Runs once at load — not the mount/build hot path.
     */
    private hydrateRoot(
        schema: TExoNodeDomSchema,
        element: Element | Text | Comment
    ): void {
        let resolved = schema;
        let scope: TExoBuildScope | undefined;
        while (typeof resolved.type === 'function') {
            const ctx = new ExoBuildContext(this, resolved, scope, schema);
            const result = this.callComponent(
                resolved,
                ctx as unknown as TExoContext
            );
            scope = ctx.effectiveScope;
            if (!result) return; // empty root — nothing to hydrate
            resolved = result;
        }
        this.hydrateElement(schema, resolved, element, scope);
    }

    // Wire a resolved (non-component) element/text schema onto a DOM node, then
    // hydrate its children.
    private hydrateElement(
        original: TExoNodeDomSchema,
        resolved: TExoNodeDomSchema,
        node: Element | Text | Comment,
        scope: TExoBuildScope | undefined
    ): void {
        const rec = this.record(original);
        rec.element = node;
        rec.lifecycle = resolved;
        if (resolved.attrs?.static?.onExoMount !== undefined) {
            this.pendingMounts.push(original);
        }
        this.setupBindings(resolved, node, original);

        if (node instanceof Element) {
            const children = this.childrenOf(
                resolved,
                resolved.attrs?.static?.children
            );
            const childNodes = node.childNodes;
            let i = 0;
            for (let c = 0; c < children.length; c++) {
                i = this.hydrateChild(children[c], childNodes, i, scope);
            }
            rec.children = children;
        }
    }

    // Hydrate one child schema starting at childNodes[i]; return the next index.
    // Resolves components/fragments and consumes the DOM nodes the child occupies.
    private hydrateChild(
        schema: TExoNodeDomSchema,
        childNodes: NodeListOf<ChildNode>,
        i: number,
        scope: TExoBuildScope | undefined
    ): number {
        let resolved = schema;
        let currentScope = scope;
        while (typeof resolved.type === 'function') {
            const ctx = new ExoBuildContext(this, resolved, currentScope, schema);
            const result = this.callComponent(
                resolved,
                ctx as unknown as TExoContext
            );
            currentScope = ctx.effectiveScope;
            if (!result) {
                // Empty component: the SSR string emitted no node here, so it
                // consumes nothing. Keep a record so onDispose can reach it.
                this.record(schema);
                if (schema.attrs?.static?.onExoMount !== undefined) {
                    this.pendingMounts.push(schema);
                }
                return i;
            }
            resolved = result;
        }

        // Fragment: transparent — its children occupy a run of sibling nodes.
        if (resolved.type === '#fragment') {
            const fragChildren = this.childrenOf(
                resolved,
                resolved.attrs?.static?.children
            );
            const rec = this.record(schema);
            if (resolved.attrs?.static?.onExoMount !== undefined) {
                this.pendingMounts.push(schema);
            }

            // A REACTIVE fragment (`<>{list}</>` / `<>{signal}</>`) must, like the
            // client build path, bracket its server-rendered run with start/end
            // comment anchors and subscribe — otherwise its children are hydrated
            // once and then frozen (list/signal updates would have no anchors to
            // reconcile between). Static fragments stay anchor-free (transparent).
            const childBindable = resolved.attrs?.bindables?.children;
            const childList = resolved.attrs?.bindableLists?.children;
            const reactive =
                childBindable != null || childList != null;

            if (!reactive) {
                let j = i;
                for (let k = 0; k < fragChildren.length; k++) {
                    j = this.hydrateChild(fragChildren[k], childNodes, j, currentScope);
                }
                rec.children = fragChildren;
                return j;
            }

            // Parent element (all fragment siblings share it). childNodes is live.
            const parent = (childNodes.length > 0
                ? childNodes[Math.min(i, childNodes.length - 1)].parentNode
                : null) as Element | null;
            const start = document.createComment('');
            const end = document.createComment('');

            // start goes immediately before the fragment's first server node; the
            // live NodeList then shifts by one, so children begin at i + 1.
            parent?.insertBefore(start, childNodes[i] ?? null);
            let j = i + 1;
            for (let k = 0; k < fragChildren.length; k++) {
                j = this.hydrateChild(fragChildren[k], childNodes, j, currentScope);
            }
            // end goes after the last hydrated child (before the next sibling).
            parent?.insertBefore(end, childNodes[j] ?? null);

            rec.fragStart = start;
            rec.fragEnd = end;
            rec.children = fragChildren;
            this.subscribeFragmentChildren(schema, childBindable, childList);
            return j + 1; // consume the end anchor too
        }

        const node = childNodes[i] as Element | Text | Comment | undefined;
        if (!node) return i; // SSR shorter than the schema — nothing to attach to.

        // Adjacent text nodes serialize together and parse back as ONE node. If the
        // DOM text is longer than this schema's text, split off the remainder so the
        // next sibling schema gets its own node.
        if (resolved.type === '#text' && node.nodeType === 3) {
            const bound = resolved.attrs?.bindables?.textContent as
                | { getValue(): unknown }
                | undefined;
            const expected = String(
                bound?.getValue() ?? resolved.attrs?.static?.textContent ?? ''
            );
            const full = node.textContent ?? '';
            if (full.length > expected.length && full.startsWith(expected)) {
                (node as Text).splitText(expected.length);
            }
        }

        this.hydrateElement(schema, resolved, node, currentScope);
        return i + 1;
    }

    // Invoke a component with a real context and reduce its result to a single
    // root schema (matching the per-node renderers' contract).
    private callComponent(
        schema: TExoNodeDomSchema,
        context: TExoContext
    ): TExoNodeDomSchema | null {
        const result = (schema.type as (ctx: TExoContext) => unknown)(context);
        if (!result) return null;
        if (Array.isArray(result)) {
            if (result.length === 0) return null;
            if (result.length === 1) return result[0] as TExoNodeDomSchema;
            throw new Error(
                `${describeSchema(schema)} returned ${result.length} root ` +
                    `schemas; a component must return a single root. Wrap the ` +
                    `siblings in one element or a fragment (<>…</>).`
            );
        }
        return result as TExoNodeDomSchema;
    }


    /**
     * Build the DOM subtree for a schema using the core walkSchema traversal.
     * Returns the root node (a DocumentFragment when the root schema is a
     * fragment, since fragments have no wrapper element).
     */
    private buildTree(
        rootSchema: TExoNodeDomSchema,
        // Ancestor scope to seed the root of THIS build with, so a subtree built
        // dynamically (reactive fragment / list reconcile) still resolves inject()
        // up the real component chain. undefined for the top-level render.
        parentScope?: TExoBuildScope,
        // Whether this subtree is being built INSIDE an <svg>. A list item added
        // to an SVG host has no parent walk node to inherit from, so the caller
        // states it — one namespace read per reconcile, not per node.
        svgParent = false
    ): Element | Text | Comment | DocumentFragment {
        type DomParent = Element | DocumentFragment;

        // Leaf fast-path: a concrete element/text root with no children (and no
        // cacheKey) needs no traversal — skip the walkSchema machinery (stack,
        // frame, result/context objects). This is the common shape for list items
        // built on append / reconcile, and for trivial reactive nodes.
        const rootType = rootSchema.type;
        const rootAttrs = rootSchema.attrs;
        if (
            typeof rootType === 'string' &&
            rootType !== '#fragment' &&
            rootSchema.cacheKey === undefined &&
            !rootAttrs?.static?.children &&
            !rootAttrs?.bindables?.children &&
            !rootAttrs?.bindableLists?.children
        ) {
            const element = this.createDomElement(
                rootSchema,
                isSvgElement(rootType, svgParent)
            );
            const rec = this.record(rootSchema);
            if (rec.element && rec.element.parentNode) {
                throw new Error(
                    `ExoNodeDom: the schema ${describeSchema(rootSchema)} was ` +
                        `rendered in two live positions — schemas must be unique ` +
                        `per position. Build a fresh schema for each position, or ` +
                        `use cache:key / cacheKey to repeat a static template.`
                );
            }
            rec.element = element;
            rec.lifecycle = rootSchema;
            this.applyStatic(rootSchema, element);
            this.setupBindings(rootSchema, element, rootSchema);
            if (rootAttrs?.static?.onExoMount !== undefined) {
                this.pendingMounts.push(rootSchema);
            }
            return element;
        }

        const root = walkSchema<TExoNodeDomSchema, TExoBuildContext>(
            rootSchema,
            (node) => {
                const schema = node.schema;
                const parentEl = node.parent?.element;
                // Lazy: a build scope is only allocated when a component actually
                // calls provide(). Non-component subtrees thread `undefined`. The
                // root node has no parent, so it inherits the caller's parentScope
                // (set when this subtree is built dynamically inside an ancestor).
                const scope = node.parent?.scope ?? parentScope;

                // Cache-key template path: the compiler marks a mostly-static subtree
                // with a shared key. First occurrence builds the skeleton (+ records
                // hole paths) and caches it; every occurrence (including the first) is
                // a clone — plus a patch of its holes when the template has any.
                const key = schema.cacheKey;
                if (key !== undefined) {
                    // A template is cached by key, and the same key can only ever
                    // appear in one namespace context — the compiler derives it
                    // from the source position.
                    const templateSvg = node.parent?.svg ?? svgParent;
                    let entry = cloneCache.get(key);
                    if (!entry) {
                        const holes: number[][] = [];
                        const skeleton = this.buildSkeleton(
                            schema,
                            [],
                            holes,
                            templateSvg
                        );
                        if (!(skeleton instanceof Element)) {
                            // #text root: nothing to clone-cache, use as-is.
                            if (parentEl) this.domInsert(parentEl, skeleton, null);
                            node.element = skeleton;
                            node.scope = scope;
                            if (schema.attrs?.static?.onExoMount !== undefined) {
                                this.pendingMounts.push(schema);
                            }
                            return;
                        }
                        entry = { skeleton, holes };
                        cloneCache.set(key, entry);
                    }
                    const element =
                        entry.holes.length === 0
                            ? (entry.skeleton.cloneNode(true) as Element)
                            : this.applyTemplate(entry, schema);
                    // A template WITH holes owns per-instance bindings, so it needs a
                    // record for dispose to reach (applyTemplate routed hole disposers
                    // onto this.record(schema)). A hole-free clone stays inert.
                    if (entry.holes.length > 0) {
                        this.record(schema).element = element;
                    }
                    if (parentEl) this.domInsert(parentEl, element, null);
                    node.element = element;
                    node.scope = scope;
                    node.svg =
                        typeof schema.type === 'string'
                            ? svgContextFor(schema.type, templateSvg)
                            : templateSvg;
                    if (schema.attrs?.static?.onExoMount !== undefined) {
                        this.pendingMounts.push(schema);
                    }
                    return;
                }

                // Fragment: transparent — its children attach to the parent
                // (or a DocumentFragment when the fragment itself is the root).
                if (schema.type === '#fragment') {
                    const container: DomParent =
                        (parentEl as DomParent | undefined) ??
                        document.createDocumentFragment();
                    node.element = container;
                    node.scope = scope;
                    const fa = schema.attrs;
                    if (fa?.static?.onExoMount !== undefined) {
                        this.pendingMounts.push(schema);
                    }
                    // Reactive children on a fragment (`bindables.children` /
                    // `bindableLists.children`): the fragment has no host element to
                    // reconcile INTO, so bracket its children with comment anchors in
                    // the parent and reconcile that range on update. Built manually
                    // (not via the walk) so insertion lands before the end anchor.
                    if (fa?.bindables?.children || fa?.bindableLists?.children) {
                        this.buildReactiveFragment(schema, container, scope);
                        return;
                    }
                    const fragChildren = this.childrenOf(
                        schema,
                        fa?.static?.children
                    );
                    node.children = fragChildren;
                    // Also onto the record: everything that walks the LOGICAL tree
                    // (dispose, unmount hooks) descends via rec.children. Without
                    // this a static fragment is a dead end — its subtree's disposers
                    // never run and its onExoUnmount never fires, so a bindable
                    // inside `<>…</>` stays subscribed after dispose.
                    this.record(schema).children = fragChildren;
                    return;
                }

                // Resolve component schemas (possibly nested) to a concrete node,
                // chaining a scope per component so provide()/inject() reach the
                // resolved subtree.
                // Canonical key = the original schema (what the parent references).
                // Component onDispose + the element's bindings all register under it.
                let resolved = schema;
                let currentScope = scope;
                while (typeof resolved.type === 'function') {
                    // The context carries the parent scope and lazily creates its
                    // own only if the component calls provide(); we read back the
                    // effective scope afterwards so children see provided values.
                    const ctx = new ExoBuildContext(
                        this,
                        resolved,
                        currentScope,
                        schema
                    );
                    const result = this.callComponent(
                        resolved,
                        ctx as unknown as TExoContext
                    );
                    currentScope = ctx.effectiveScope;
                    if (!result) {
                        const comment = document.createComment('empty-component');
                        this.record(schema).element = comment;
                        if (parentEl) this.domInsert(parentEl, comment, null);
                        node.element = comment;
                        node.scope = currentScope;
                        if (schema.attrs?.static?.onExoMount !== undefined) {
                            this.pendingMounts.push(schema);
                        }
                        return;
                    }
                    resolved = result;
                }

                // Always create a new element - can't reuse the same DOM node
                const parentSvg = node.parent?.svg ?? svgParent;
                const isSvg =
                    typeof resolved.type === 'string' &&
                    isSvgElement(resolved.type, parentSvg);
                const element = this.createDomElement(resolved, isSvg);
                const rec = this.record(schema);
                // Schemas are identity-keyed (one record per schema object). The
                // same object live in two positions would collide — forbid it.
                // Sequential reuse (show/hide) goes through reattach, and repeated
                // static templates through cache:key/cacheKey clones, so neither
                // trips this.
                if (rec.element && rec.element.parentNode) {
                    throw new Error(
                        `ExoNodeDom: the schema ${describeSchema(resolved)} was ` +
                            `rendered in two live positions — schemas must be ` +
                            `unique per position. Build a fresh schema for each ` +
                            `position, or use cache:key / cacheKey to repeat a ` +
                            `static template.`
                    );
                }
                rec.element = element;
                rec.lifecycle = resolved;
                // One pass over the static bucket: write attributes AND capture the
                // static children (the reconciler resolves the effective list from
                // them below) — no separate scan to re-find children.
                const staticChildren = this.applyStatic(resolved, element);
                // Skip the setupBindings CALL for fully-static nodes (no reactive
                // buckets) — the guard was inside setupBindings, so a static node
                // still paid a function call + re-read of attrs. Inlining it here
                // avoids ~1 call per node, and the bulk of an initial render is
                // static nodes.
                const ra = resolved.attrs;
                // Queued off the RESOLVED schema — for a component the hook lives on
                // what it returned, which is also what `rec.lifecycle` points at.
                if (ra?.static?.onExoMount !== undefined) {
                    this.pendingMounts.push(schema);
                }
                if (ra && (ra.bindables || ra.handlers || ra.bindableHandlers || ra.bindableLists)) {
                    this.setupBindings(resolved, element, schema);
                    // A host with reactive `children` builds new children on later
                    // updates (updateChildren / applyListOp) — capture the scope now
                    // on the CANONICAL record (where children + disposers live, and
                    // which the reconcile keys off) so those children resolve inject()
                    // up the real chain.
                    if (ra.bindables?.children || ra.bindableLists?.children) {
                        rec.scope = currentScope;
                    }
                }
                if (parentEl) this.domInsert(parentEl, element, null);

                node.element = element;
                node.scope = currentScope;
                node.svg =
                    typeof resolved.type === 'string'
                        ? svgContextFor(resolved.type, parentSvg)
                        : parentSvg;
                // `staticChildren === null` means dangerouslySetInnerHTML owns the
                // content (applyStatic already wrote it) — building children on top
                // of it would append to raw markup the author asked to control.
                if (element instanceof Element && staticChildren !== null) {
                    const children = this.childrenOf(resolved, staticChildren);
                    if (children.length > 0) {
                        // Fast path: a STATIC list of already-cached cache-key clones
                        // (a keyed list of identical static templates) is cloned +
                        // appended inline, skipping a walkSchema frame + visit per
                        // child. Guarded to static children only (no reactive source),
                        // so the inert clones are never reconciled/disposed per node.
                        const a = resolved.attrs;
                        const staticList =
                            !a?.bindableLists?.children && !a?.bindables?.children;
                        if (
                            staticList &&
                            this.tryInlineCachedClones(element, children)
                        ) {
                            // handled inline — clones are inert, no bookkeeping
                        } else {
                            // A reactive host (this element will reconcile its
                            // children by index) cannot host a #fragment item — it
                            // spreads N nodes and desyncs the index math. Reject at
                            // build time so it fails clearly, not by silently
                            // corrupting the DOM on a later op. UNCONDITIONAL (like the
                            // "two live positions" throw): it guards a structural
                            // invariant, not a dev warning — a prod build must not fall
                            // back to silent corruption. The scan is off the per-node
                            // path (reactive hosts only) and measured as free.
                            if (!staticList) {
                                for (let ci = 0; ci < children.length; ci++) {
                                    if (children[ci].type === '#fragment') {
                                        throw new Error(FRAGMENT_LIST_ITEM_ERROR);
                                    }
                                }
                            }
                            rec.children = children;
                            node.children = children;
                        }
                    }
                }
            },
            createBuildNode
        );
        return root.element!;
    }

    // Fast path for a homogeneous STATIC list of already-cached HOLE-FREE cache-key
    // clones (a keyed list of identical static templates): clone each cached skeleton
    // and append it directly, skipping a walkSchema frame + visit dispatch per child.
    // Returns true iff it handled the whole list; false (having mutated NOTHING) the
    // moment any child is a first-occurrence / dynamic / non-cache-key node OR a
    // template WITH holes (those need per-instance patching, so they go through the
    // normal cache-key branch). Hole-free clones are inert — no per-node bookkeeping.
    private tryInlineCachedClones(
        element: Element,
        children: TExoNodeDomSchema[]
    ): boolean {
        // Probe the first child before allocating, so the common (non-cache-key)
        // case pays only one property read and bails.
        const firstKey = children[0].cacheKey;
        const firstTpl =
            firstKey !== undefined ? cloneCache.get(firstKey) : undefined;
        if (!firstTpl || firstTpl.holes.length > 0) return false;

        const skeletons: Element[] = [firstTpl.skeleton];
        for (let i = 1; i < children.length; i++) {
            const key = children[i].cacheKey;
            const tpl = key !== undefined ? cloneCache.get(key) : undefined;
            if (!tpl || tpl.holes.length > 0) return false; // safe to bail — nothing appended
            skeletons.push(tpl.skeleton);
        }
        for (let i = 0; i < skeletons.length; i++) {
            element.appendChild(skeletons[i].cloneNode(true));
        }
        return true;
    }

    // Build a `cacheKey` subtree's SKELETON: structure + static attributes only, with
    // dynamic holes (nodes carrying bindables/handlers) left EMPTY and their
    // child-index path recorded in `holes`. No bindings are set here — the skeleton
    // is cloned and patched per occurrence. `path` is the running child-index chain
    // from the skeleton root. A fully-static subtree records no holes, so its
    // skeleton is exactly the old inert clone.
    private buildSkeleton(
        schema: TExoNodeDomSchema,
        path: number[],
        holes: number[][],
        svgParent = false
    ): Element | Text {
        if (schema.type === '#text') {
            return document.createTextNode(
                String(schema.attrs?.static?.textContent ?? '')
            );
        }
        const type = schema.type as string;
        const element = isSvgElement(type, svgParent)
            ? document.createElementNS(SVG_NS, type)
            : document.createElement(type);
        const childSvg = svgContextFor(type, svgParent);
        const attrs = schema.attrs;
        // A node with any reactive/handler bucket is a hole: record its path so an
        // occurrence patches it after cloning. Its static attrs/children are still
        // baked into the skeleton (only the reactive parts are deferred).
        if (
            attrs &&
            (attrs.bindables ||
                attrs.handlers ||
                attrs.bindableHandlers ||
                attrs.bindableLists)
        ) {
            holes.push(path.slice());
        }
        // Bake static attributes/textContent into the skeleton; `applyStatic` returns
        // the raw static children. Structure comes from STATIC children only (a
        // reactive children bucket is an insert-point — not supported by templates
        // yet; such a subtree must not be given a cacheKey).
        const staticChildren = this.normalizeChildren(
            (this.applyStatic(schema, element) ?? []) as
                | TExoNodeDomSchema
                | readonly TExoNodeDomSchema[]
        );
        for (let i = 0; i < staticChildren.length; i++) {
            path.push(i);
            element.appendChild(
                this.buildSkeleton(staticChildren[i], path, holes, childSvg)
            );
            path.pop();
        }
        return element;
    }

    // Materialise one occurrence of a template: clone the skeleton, then for each
    // hole navigate the clone AND the occurrence's schema by the same path and bind
    // (textContent / attribute / handler). Hole disposers are collected on the
    // occurrence's record so dispose cleans the whole instance in one place.
    private applyTemplate(
        entry: TExoTemplate,
        schema: TExoNodeDomSchema
    ): Element {
        const root = entry.skeleton.cloneNode(true) as Element;
        const holes = entry.holes;
        for (let i = 0; i < holes.length; i++) {
            const path = holes[i];
            let el: Node = root;
            let sub: TExoNodeDomSchema = schema;
            for (let d = 0; d < path.length; d++) {
                el = el.childNodes[path[d]];
                sub = this.childrenOf(sub, sub.attrs?.static?.children)[
                    path[d]
                ];
            }
            // Bind under the template root's record so all hole disposers live
            // together and dispose(root) cleans them.
            this.setupBindings(sub, el as Element | Text, schema);
        }
        return root;
    }


    // Creates the DOM node for a CONCRETE schema (components are already resolved
    // by buildTree before this is called).
    private createDomElement(
        schema: TExoNodeDomSchema,
        svg = false
    ): Element | Text | Comment {
        const type = schema.type;
        if (type === '#text') {
            return document.createTextNode(
                String(schema.attrs?.static?.textContent ?? '')
            );
        }
        if (typeof type === 'string') {
            // One boolean test on the HTML path; the namespaced call only
            // happens inside an <svg>.
            return svg
                ? document.createElementNS(SVG_NS, type)
                : document.createElement(type);
        }
        throw new Error(
            `ExoNodeDom: cannot create a DOM node for ${describeSchema(schema)} ` +
                `— its \`type\` is ${String(type)} (${typeof type}). A node type ` +
                `must be a tag name (string) or a component (function).`
        );
    }

    // Apply the static bucket to `element` in ONE pass — write attributes, set
    // `textContent`, skip the non-attribute keys (lifecycle hooks are read
    // elsewhere) — and hand back the raw `static.children` value (or undefined) so
    // the caller finds children without a second scan of the bucket. Non-Element
    // nodes (text/comment) carry no static attrs and their text is set at creation,
    // so this is a no-op returning undefined.
    private applyStatic(
        schema: TExoNodeDomSchema,
        element: Element | Text | Comment
    ): unknown {
        const staticAttrs = schema.attrs?.static;
        if (!(element instanceof Element) || !staticAttrs) return undefined;

        // `Object.keys` + index loop instead of `for..in`: attr objects have varying
        // shapes across a tree, which makes `for..in` miss V8's enumeration cache and
        // pay a slow prototype-walk each node. `Object.keys` is a fast own-key array.
        let children: unknown;
        let rawHtml: unknown;
        const keys = Object.keys(staticAttrs);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            // Non-attribute static keys, dispatched inline (no Set lookup): capture
            // children for the caller, set textContent, ignore lifecycle hooks.
            // (These compares are cheap even though the names are long — an equality
            // test on differing lengths never looks at the characters.)
            if (key === 'children') {
                children = staticAttrs.children;
            } else if (key === 'textContent') {
                // Nullish means "no textContent", NOT the string "null": the node
                // falls back to its children, exactly as the string renderer does.
                const value = staticAttrs.textContent;
                if (value != null) element.textContent = String(value);
            } else if (key === 'dangerouslySetInnerHTML') {
                // Applied after the loop: it overrides textContent and children
                // regardless of key order, matching the string renderer.
                rawHtml = staticAttrs[key];
            } else if (key === 'onExoMount' || key === 'onExoUnmount') {
                // read by setupBindings / disposeSchema, not a DOM attribute
            } else {
                this.writeAttr(element, key, staticAttrs[key]);
            }
        }

        if (rawHtml !== undefined && rawHtml !== null) {
            const html = (rawHtml as { __html?: unknown }).__html;
            if (html != null) {
                element.innerHTML = String(html);
                // `null` (not undefined) tells the caller this element's content is
                // owned by the raw HTML, so it must not also build children.
                return null;
            }
        }
        return children;
    }

    // Apply one attribute value (string/boolean/null) — shared by static + bound.
    private writeAttr(element: Element, key: string, value: unknown): void {
        if (key === 'className') {
            // `className` on an SVG element is a read-only SVGAnimatedString:
            // assigning to it silently does nothing, so SVG goes through the
            // attribute. HTML keeps the direct property write, which is faster.
            if (element.namespaceURI === SVG_NS) {
                element.setAttribute('class', String(value ?? ''));
            } else {
                element.className = String(value ?? '');
            }
        } else if (typeof value === 'boolean') {
            if (value) element.setAttribute(key, '');
            else element.removeAttribute(key);
        } else if (value != null) {
            element.setAttribute(key, String(value));
        } else {
            element.removeAttribute(key);
        }
    }

    private setupBindings(
        schema: TExoNodeDomSchema,
        element: Element | Text | Comment,
        keySchema: TExoNodeDomSchema = schema
    ): void {
        const attrs = schema.attrs;
        if (!attrs) return;
        // Static fast path: a node with no reactive buckets has nothing to bind
        // and nothing to dispose. Bail before allocating the disposers array —
        // this is the common case for the bulk of an initial render.
        if (
            !attrs.bindables &&
            !attrs.handlers &&
            !attrs.bindableHandlers &&
            !attrs.bindableLists
        ) {
            return;
        }
        const isElement = element instanceof Element;
        const disposers: Array<() => void> = [];

        const bindables = attrs.bindables;
        if (bindables) {
            for (const key in bindables) {
                // The bucket is already typed as bindables; the cast only adds
                // `undefined`, which a `for..in` over a partial record can yield.
                const binding = bindables[key] as
                    | TExoBindable<unknown, unknown>
                    | undefined;
                if (!binding) continue;
                if (key === 'children') continue; // handled separately
                if (key === 'textContent') {
                    const el = element as Text | Element;
                    const b = binding;
                    // A nullish value means "no textContent" — leave the node's
                    // children alone (the string renderer falls back to them).
                    // Once a real value has been written the children are gone, so
                    // a later nullish can only clear the text.
                    const initial = b.getValue();
                    if (initial != null) el.textContent = String(initial);
                    disposers.push(b.onChange(() => {
                        const next = b.getValue();
                        el.textContent = next == null ? '' : String(next);
                    }));
                } else if (isElement) {
                    const el = element as Element;
                    const b = binding;
                    const k = key;
                    this.writeAttr(el, k, b.getValue());
                    disposers.push(b.onChange(() => {
                        this.writeAttr(el, k, b.getValue());
                    }));
                }
            }
        }

        const handlers = attrs.handlers;
        if (handlers && isElement) {
            const el = element;
            for (const name in handlers) {
                const handler = handlers[name];
                if (!handler) continue;
                const eventName = name.slice(2).toLowerCase();
                el.addEventListener(eventName, handler as EventListener);
                disposers.push(() =>
                    el.removeEventListener(eventName, handler as EventListener)
                );
            }
        }

        const bindableHandlers = attrs.bindableHandlers;
        if (bindableHandlers && isElement) {
            const el = element;
            for (const name in bindableHandlers) {
                const binding = bindableHandlers[name] as
                    | {
                          getValue(): EventListener | null;
                          onChange(cb: () => void): () => void;
                      }
                    | undefined;
                if (!binding) continue;
                const eventName = name.slice(2).toLowerCase();
                let currentHandler: EventListener | null = null;
                const update = () => {
                    if (currentHandler) el.removeEventListener(eventName, currentHandler);
                    currentHandler = binding.getValue();
                    if (currentHandler) el.addEventListener(eventName, currentHandler);
                };
                update();
                disposers.push(() => {
                    if (currentHandler) el.removeEventListener(eventName, currentHandler);
                });
                disposers.push(binding.onChange(update));
            }
        }

        const childBindable = bindables?.children as
            | TExoBindable<unknown, unknown>
            | undefined;
        if (childBindable) {
            disposers.push(
                childBindable.onChange(() =>
                    // Reconcile against keySchema — the CANONICAL record that holds
                    // rec.children. For a component-wrapped host, `schema` here is the
                    // resolved element (a different record with no children), so using
                    // it would never find the old children and would append instead
                    // of replace.
                    this.updateChildren(
                        keySchema,
                        element as Element,
                        childBindable.getValue()
                    )
                )
            );
        }

        const childList = attrs.bindableLists?.children as
            | { onChange(cb: (op: TExoListOp<TExoNodeDomSchema>) => void): () => void }
            | undefined;
        if (childList) {
            disposers.push(
                childList.onChange(op =>
                    this.applyListOp(keySchema, element as Element, op)
                )
            );
        }

        if (disposers.length > 0) {
            const rec = this.record(keySchema);
            if (rec.disposers) {
                for (let i = 0; i < disposers.length; i++) {
                    rec.disposers.push(disposers[i]);
                }
            } else {
                rec.disposers = disposers;
            }
        }
    }

    // Effective children for a schema (last-wins across buckets): a reactive
    // bindableList / bindable overrides static children. `staticRaw` is the
    // already-known `static.children` value — the build path passes what
    // `applyStatic` captured in its single pass (no re-read); other callers pass
    // `schema.attrs?.static?.children` directly (they never scanned the bucket, so
    // it is their only read, not a redundant one).
    private childrenOf(
        schema: TExoNodeDomSchema,
        staticRaw: unknown
    ): TExoNodeDomSchema[] {
        const a = schema.attrs;

        const childList = a?.bindableLists?.children;
        if (childList) {
            return this.adoptChildren(
                (childList as unknown as { getValue(): unknown }).getValue()
            );
        }

        const childBinding = a?.bindables?.children;
        if (childBinding) {
            return this.adoptChildren(
                (childBinding as { getValue(): unknown }).getValue()
            );
        }

        if (staticRaw == null) return [];
        return this.normalizeChildren(
            staticRaw as TExoNodeDomSchema | readonly TExoNodeDomSchema[]
        );
    }

    // The element a lifecycle hook for `schema` is attached to.
    private targetFor(schema: TExoNodeDomSchema): TExoDomMountTarget {
        const element = schema.exoRecord?.element ?? this.element;
        return { element: element as Element | Text | Comment };
    }

    // Unmount a schema subtree: run + clear its disposers, fire onExoUnmount, then
    // recurse. Used for full dispose AND for list/child removals (the element may
    // still be reused later, hence disposers are cleared so re-binding is clean).
    // `release` is set only by the final dispose(): it frees the schema's `exoRecord`
    // slot so the schema can be mounted again. The record used to live in a per-
    // instance WeakMap, which a fresh renderer simply never saw; now it hangs off
    // the schema, so leaving it behind would make a re-mount trip the
    // two-live-positions guard (a disposed subtree keeps its INNER parent links —
    // only the root gets detached). Removals that may reattach later pass false.
    private disposeSchema(schema: TExoNodeDomSchema, release = false): void {
        const rec = schema.exoRecord;
        if (rec?.disposers) {
            for (let i = 0; i < rec.disposers.length; i++) rec.disposers[i]();
            rec.disposers = undefined;
        }

        const onUnmount = (rec?.lifecycle ?? schema).attrs?.static?.onExoUnmount;
        if (typeof onUnmount === 'function') {
            onUnmount(this.targetFor(schema));
        }

        const children = rec?.children;
        if (children) {
            for (let i = 0; i < children.length; i++) {
                this.disposeSchema(children[i], release);
            }
        }
        if (release) schema.exoRecord = undefined;
    }

    /**
     * Normalise a reactive source's children into an array this renderer OWNS.
     *
     * Whatever lands in `rec.children` is the reconciler's private state: list
     * ops splice it, and the next diff compares against it. A reactive source's
     * value is NOT ours to mutate — a bindableList's value is documented as a
     * stable array, so splicing it would apply every op to the source twice, and
     * a bindable holding an array would see its array change under it (and the
     * diff would compare the new children against themselves and see no change).
     *
     * `normalizeChildren` already allocates in every case except its fast path,
     * where it returns the input untouched — that is the one case to copy.
     */
    private adoptChildren(value: unknown): TExoNodeDomSchema[] {
        const normalized = this.normalizeChildren(
            value as TExoNodeDomSchema | readonly TExoNodeDomSchema[]
        );
        return normalized === (value as unknown) ? normalized.slice() : normalized;
    }

    protected normalizeChildren(
        children: TExoNodeDomSchema | readonly TExoNodeDomSchema[]
    ): TExoNodeDomSchema[] {
        if (children == null || typeof children === 'boolean') return [];
        if (!Array.isArray(children)) {
            const t = typeof children;
            if (t === 'string' || t === 'number' || t === 'bigint') {
                return [textSchema(children as unknown as string | number)];
            }
            return [children as TExoNodeDomSchema];
        }

        // Fast path: an array that is already a clean list of schema objects (the
        // common case — a bindableList snapshot, or static children with no
        // primitives / nested arrays / falsy holes) is returned as-is, no alloc.
        // A schema is the only object shape allowed here, so ONE `typeof` decides
        // it — cheaper than testing each primitive tag in turn (measured ~55%
        // faster on a clean 32-item array), and it catches bigint/symbol holes the
        // per-tag list used to miss.
        let needsWork = false;
        for (let i = 0; i < children.length; i++) {
            const c = children[i];
            if (c === null || typeof c !== 'object' || Array.isArray(c)) {
                needsWork = true;
                break;
            }
        }
        if (!needsWork) return children as TExoNodeDomSchema[];

        // Flatten nested arrays, textify primitives, drop nullish/boolean holes —
        // exactly what JSX `.map()` siblings and `{cond && <x/>}` conditionals
        // produce (matching the string renderer's behaviour).
        const out: TExoNodeDomSchema[] = [];
        const push = (c: unknown): void => {
            if (c == null || typeof c === 'boolean') return;
            if (Array.isArray(c)) {
                for (let i = 0; i < c.length; i++) push(c[i]);
                return;
            }
            const t = typeof c;
            out.push(
                t === 'string' || t === 'number' || t === 'bigint'
                    ? textSchema(c as string | number)
                    : (c as TExoNodeDomSchema)
            );
        };
        for (let i = 0; i < children.length; i++) push(children[i]);
        return out;
    }

    // Build a FRAGMENT whose children are reactive. A fragment is transparent (no
    // wrapper element), so its children live in `parent` between two comment
    // anchors and updates reconcile only that range. Built here (not via the walk)
    // so each child lands before the end anchor; their onExoMount fires with the
    // rest of the tree at commit time (they sit on `rec.children`).
    // Subscribe a reactive fragment's children to its record's anchors. Used by
    // the HYDRATE path (not the hot build path): after hydration brackets the
    // server-rendered run with start/end anchors, this wires the same reconcile
    // that buildReactiveFragment sets up so post-hydration updates work.
    private subscribeFragmentChildren(
        recordKey: TExoNodeDomSchema,
        childBindable: unknown,
        childList: unknown
    ): void {
        const rec = this.record(recordKey);
        const disposers = rec.disposers ?? (rec.disposers = []);
        const b = childBindable as
            | TExoBindable<unknown, unknown>
            | undefined;
        if (b) {
            disposers.push(
                b.onChange(() =>
                    this.updateFragmentChildren(recordKey, b.getValue())
                )
            );
        }
        const l = childList as
            | TExoBindableList<TExoNodeDomSchema, unknown>
            | undefined;
        if (l) {
            disposers.push(
                l.onChange(() =>
                    this.updateFragmentChildren(recordKey, l.getValue())
                )
            );
        }
    }

    private buildReactiveFragment(
        schema: TExoNodeDomSchema,
        parent: Element | DocumentFragment,
        scope: TExoBuildScope | undefined
    ): void {
        const rec = this.record(schema);
        // Capture the ancestor scope so children built on a later update (and the
        // initial ones below) resolve inject() up the real chain.
        rec.scope = scope;
        const start = document.createComment('');
        const end = document.createComment('');
        // At visit time `parent` ends exactly where this fragment sits (later
        // siblings append after), so appending the anchors brackets its run.
        this.domInsert(parent, start, null);
        this.domInsert(parent, end, null);
        rec.fragStart = start;
        rec.fragEnd = end;

        const initial = this.childrenOf(schema, schema.attrs?.static?.children);
        for (let i = 0; i < initial.length; i++) {
            this.domInsert(
                parent,
                this.buildListItem(initial[i], scope, isSvgHost(parent)),
                end
            );
        }
        rec.children = initial;

        const disposers = rec.disposers ?? (rec.disposers = []);
        const childBindable = schema.attrs?.bindables?.children as
            | TExoBindable<unknown, unknown>
            | undefined;
        if (childBindable) {
            disposers.push(
                childBindable.onChange(() =>
                    this.updateFragmentChildren(schema, childBindable.getValue())
                )
            );
        }
        const childList = schema.attrs?.bindableLists?.children as
            | TExoBindableList<TExoNodeDomSchema, unknown>
            | undefined;
        if (childList) {
            // No host element for the O(1) list ops, so reconcile to the full
            // snapshot on each op — correct; reactive lists on a bare fragment are rare.
            disposers.push(
                childList.onChange(() =>
                    this.updateFragmentChildren(schema, childList.getValue())
                )
            );
        }
    }

    // Anchor-scoped reconcile for a reactive fragment: the same identity diff as
    // updateChildren, but bounded to the nodes between the fragment's start/end
    // anchors (sibling nodes in the shared parent are untouched) and inserting
    // before the end anchor.
    private updateFragmentChildren(
        schema: TExoNodeDomSchema,
        newChildren: unknown
    ): void {
        const rec = this.record(schema);
        const start = rec.fragStart;
        const end = rec.fragEnd;
        const parent = end?.parentNode as Element | null;
        if (!start || !end || !parent) return;

        const normalized = this.adoptChildren(newChildren);
        const oldSchemas = rec.children ?? [];
        const hostIsSvg = isSvgHost(parent);

        // The fragment's live nodes: everything strictly between its anchors.
        const existing: Array<Element | Text | Comment> = [];
        for (let n = start.nextSibling; n && n !== end; n = n.nextSibling) {
            existing.push(n as Element | Text | Comment);
        }

        const newElements: (Element | Text | Comment)[] = new Array(
            normalized.length
        );
        const built: TExoNodeDomSchema[] = [];
        for (let i = 0; i < normalized.length; i++) {
            const childSchema = normalized[i];
            if (oldSchemas[i] === childSchema && existing[i]) {
                newElements[i] = existing[i];
                continue;
            }
            const existingEl = childSchema.exoRecord?.element;
            if (existingEl) {
                newElements[i] =
                    existingEl.parentNode === parent
                        ? (existingEl as Element | Text | Comment)
                        : this.reattach(childSchema);
            } else {
                newElements[i] = this.buildListItem(
                    childSchema,
                    rec.scope,
                    hostIsSvg
                );
                built.push(childSchema);
            }
        }

        const nextSet = new Set(normalized);
        for (let i = 0; i < oldSchemas.length; i++) {
            if (!nextSet.has(oldSchemas[i])) this.disposeSchema(oldSchemas[i]);
        }

        const keep = new Set(newElements);
        for (let i = 0; i < existing.length; i++) {
            if (!keep.has(existing[i])) this.domRemove(parent, existing[i]);
        }

        // Position each node before the end anchor (right-to-left, O(1) nextSibling).
        let after: ChildNode | null = end;
        for (let i = newElements.length - 1; i >= 0; i--) {
            const want = newElements[i];
            if (want.parentNode !== parent || want.nextSibling !== after) {
                this.domInsert(parent, want, after);
            }
            after = want;
        }

        rec.children = normalized;
        this.flushMounts(); // `built` already queued itself during buildTree
    }

    private updateChildren(
        schema: TExoNodeDomSchema,
        element: Element,
        newChildren: unknown
    ): void {
        const normalized = this.adoptChildren(newChildren);
        const rec = this.record(schema);
        const oldSchemas = rec.children ?? [];
        const n = normalized.length;
        const hostIsSvg = isSvgHost(element);

        // Old position of each prior child schema — for the minimal-move reorder.
        const oldIndexOf =
            oldSchemas.length > 0 ? new Map<TExoNodeDomSchema, number>() : null;
        if (oldIndexOf) {
            for (let i = 0; i < oldSchemas.length; i++) oldIndexOf.set(oldSchemas[i], i);
        }

        // Resolve the target node for each new child — reuse by SCHEMA IDENTITY (a
        // Map lookup that handles moves; a detached node — show/hide/filtered — is
        // reattached to re-bind), build only genuinely new ones (they run onExoMount
        // after attach). `newToOld[i]` is 0 for "new/insert" else oldIndex+1;
        // `anyMoved` stays false when every reused child is already in order (append
        // / in-place change) so the LIS pass is skipped entirely.
        const newElements: (Element | Text | Comment)[] = new Array(n);
        const newToOld = new Array<number>(n);
        const built: TExoNodeDomSchema[] = [];
        let anyMoved = false;
        let maxOld = -1;
        for (let i = 0; i < n; i++) {
            const childSchema = normalized[i];
            const existingEl = childSchema.exoRecord?.element;
            if (existingEl) {
                newElements[i] =
                    existingEl.parentNode === element
                        ? (existingEl as Element | Text | Comment)
                        : this.reattach(childSchema);
                const oi = oldIndexOf ? oldIndexOf.get(childSchema) : undefined;
                if (oi === undefined) {
                    newToOld[i] = 0;
                } else {
                    newToOld[i] = oi + 1;
                    if (oi < maxOld) anyMoved = true;
                    else maxOld = oi;
                }
            } else {
                newElements[i] = this.buildListItem(
                    childSchema,
                    rec.scope,
                    hostIsSvg
                );
                built.push(childSchema);
                newToOld[i] = 0;
            }
        }

        // Remove + dispose the children that are gone — remove the DOM node in the
        // same pass (no childNodes copy, no keep-set). A gone child maps to one root
        // node (elements, single-root components — multi-root is rejected); removing
        // it drops its whole subtree.
        if (oldSchemas.length > 0) {
            const nextSet = new Set(normalized);
            for (let i = 0; i < oldSchemas.length; i++) {
                const os = oldSchemas[i];
                if (!nextSet.has(os)) {
                    const gone = os.exoRecord?.element;
                    if (gone && gone.parentNode === element) this.domRemove(element, gone);
                    this.disposeSchema(os);
                }
            }
        }

        // Reorder with the MINIMAL number of DOM moves: keep the longest run of
        // already-in-order reused nodes (the LIS of their old indices) in place, move
        // only the rest, insert the new ones. Walk right-to-left so each node anchors
        // before its already-placed successor. (The previous pass repositioned every
        // out-of-place node — ~1.9× the moves on a shuffle; measured.)
        const seq = anyMoved ? getSequence(newToOld) : EMPTY_NUMS;
        let s = seq.length - 1;
        for (let i = n - 1; i >= 0; i--) {
            const after = i + 1 < n ? newElements[i + 1] : null;
            if (newToOld[i] === 0) {
                this.domInsert(element, newElements[i], after); // newly built / fresh position
            } else if (anyMoved) {
                if (s >= 0 && seq[s] === i) s--; // in the stable run — already placed
                else this.domInsert(element, newElements[i], after); // out of order — move
            }
            // (!anyMoved && reused) => already in order, nothing to do
        }

        rec.children = normalized;
        this.flushMounts(); // `built` already queued itself during buildTree
    }

    // Backend node-mutation hooks — the ONLY DOM-tree operations. Routed through
    // methods so a shared choreographer could override them per backend. In prod
    // only ExoNodeDom is instantiated → these calls stay monomorphic → V8 inlines.
    protected domInsert(parent: Node, node: Node, before: Node | null): void {
        parent.insertBefore(node, before);
    }
    protected domRemove(parent: Node, node: Node): void {
        parent.removeChild(node);
    }
    protected domReplace(parent: Node, next: Node, prev: Node): void {
        parent.replaceChild(next, prev);
    }

    // The node at list position `i`. `rec.children` is kept in lockstep with this
    // element's child nodes (one node per item — buildListItem enforces it), so the
    // record already holds the index→node map.
    //
    // NOT `element.childNodes[i]`: that is a live NodeList over a linked list, and
    // Blink only caches a SEQUENTIAL cursor. Random index access is O(n) — measured
    // at 420ns for n=1000 and 21µs for n=50000 — which silently turned every "O(1)"
    // list op into O(n) on a long list. Through the record it is an array index.
    private nodeAt(
        current: TExoNodeDomSchema[],
        i: number
    ): ChildNode | undefined {
        const child = current[i];
        return (child?.exoRecord as TExoNodeRecord | undefined)?.element as
            | ChildNode
            | undefined;
    }

    private applyListOp(
        schema: TExoNodeDomSchema,
        element: Element,
        op: TExoListOp<TExoNodeDomSchema>
    ): void {
        if (!op || typeof op !== 'object') return;
        const rec = this.record(schema);
        const current = rec.children ?? (rec.children = []);

        if (op.type === 'remove') {
            const index = op.index;
            if (index < 0 || index >= current.length) return;
            const actualCount = Math.min(op.count ?? 1, current.length - index);
            for (let i = 0; i < actualCount; i++) {
                const schemaToRemove = current[index + i];
                const childToRemove = this.nodeAt(current, index + i);
                if (childToRemove && schemaToRemove) {
                    this.disposeSchema(schemaToRemove);
                    this.domRemove(element, childToRemove);
                }
            }
            current.splice(index, actualCount);
            return;
        }

        if (op.type === 'insert') {
            const index = Math.min(op.index, current.length);
            const newSchema = op.item;
            const element0 = this.reuseOrBuild(newSchema, rec.scope, isSvgHost(element));
            const nextSibling = this.nodeAt(current, index);
            this.domInsert(element, element0, nextSibling ?? null);
            current.splice(index, 0, newSchema);
            return;
        }

        if (op.type === 'set') {
            const index = op.index;
            if (index < 0 || index >= current.length) return;
            const oldChild = this.nodeAt(current, index);
            this.disposeSchema(current[index]);
            const newElement = this.reuseOrBuild(op.item, rec.scope, isSvgHost(element));
            if (oldChild) this.domReplace(element, newElement, oldChild);
            else this.domInsert(element, newElement, null);
            current[index] = op.item;
            return;
        }

        if (op.type === 'move') {
            const from = op.from;
            const to = op.to;
            if (from < 0 || from >= current.length || to < 0) return;
            const actualCount = Math.min(op.count ?? 1, current.length - from);
            const actualTo = Math.min(to, current.length - actualCount);

            // Resolve every node BEFORE detaching any of them — removal shifts the
            // positions of the ones still to come.
            const elementsToMove: ChildNode[] = [];
            for (let i = 0; i < actualCount; i++) {
                const elementToMove = this.nodeAt(current, from + i);
                if (elementToMove) elementsToMove.push(elementToMove);
            }
            for (let i = 0; i < elementsToMove.length; i++) {
                this.domRemove(element, elementsToMove[i]);
            }
            const moved = current.splice(from, actualCount);
            current.splice(actualTo, 0, ...moved);

            // `actualTo + moved.length` is the first item AFTER the moved run in the
            // updated order — the anchor to insert before.
            const insertBeforeNode =
                this.nodeAt(current, actualTo + moved.length) ?? null;
            for (let i = 0; i < elementsToMove.length; i++) {
                this.domInsert(element, elementsToMove[i], insertBeforeNode);
            }
            return;
        }

        // reset / unknown -> keyed reconcile against the full snapshot.
        this.updateChildren(
            schema,
            element,
            this.childrenOf(schema, schema.attrs?.static?.children)
        );
    }

    // Reuse a detached element for a schema if one exists, else build a fresh one.
    // A detached element keeps its DOM but its bindings were disposed on detach, so
    // reuse RE-BINDS the whole subtree (deep bindables + event handlers) — the same
    // schema is shown again without re-rendering.
    private reuseOrBuild(
        schema: TExoNodeDomSchema,
        scope?: TExoBuildScope,
        svgParent = false
    ): Element | Text | Comment {
        const existing = schema.exoRecord?.element;
        if (existing && !existing.parentNode) {
            return this.reattach(schema);
        }
        return this.buildListItem(schema, scope, svgParent);
    }

    // buildTree for a reactive-list ITEM: the reconcile assumes one DOM node per
    // item, so a multi-node result (a #fragment / a component resolving to one)
    // must fail loudly rather than silently corrupt sibling positions.
    private buildListItem(
        schema: TExoNodeDomSchema,
        scope?: TExoBuildScope,
        svgParent = false
    ): Element | Text | Comment {
        const node = this.buildTree(schema, scope, svgParent);
        if (node instanceof DocumentFragment) {
            throw new Error(FRAGMENT_LIST_ITEM_ERROR);
        }
        return node as Element | Text | Comment;
    }

    // Re-establish bindings across a previously-built, now-detached subtree. Runs
    // recursively so deep bindables (textContent/attrs catch up via the immediate
    // update()) and deep event handlers (re-added) come back to life.
    private reattach(schema: TExoNodeDomSchema): Element | Text | Comment {
        // Only ever called for a schema this renderer already BUILT (its element
        // is what we are re-attaching), so the record and its element exist.
        const rec = schema.exoRecord!;
        if (rec.disposers) {
            for (let i = 0; i < rec.disposers.length; i++) rec.disposers[i]();
            rec.disposers = undefined;
        }
        const src = rec.lifecycle ?? schema;
        this.setupBindings(src, rec.element!, schema);

        // Re-sync children. Reactive children may have changed while detached
        // (the subscription was dead), so reconcile to the current snapshot;
        // static children just re-bind recursively.
        const attrs = src.attrs;
        if (
            (attrs?.bindableLists?.children || attrs?.bindables?.children) &&
            rec.element instanceof Element
        ) {
            this.updateChildren(
                schema,
                rec.element,
                this.childrenOf(src, src.attrs?.static?.children)
            );
        } else if (rec.children) {
            for (let i = 0; i < rec.children.length; i++) {
                this.reattach(rec.children[i]);
            }
        }
        return rec.element!;
    }

    /**
     * Commit mount — fire onExoMount across the whole subtree (parent-first),
     * not just the root, so nested mount hooks (and behaviour directives) run.
     */
    public commitMount(): void {
        this.flushMounts();
    }

    // Fire the onExoMount hooks queued by the build (parent-first, in build order).
    // Also used for nodes built LATER by a reactive update — a child entering a
    // `bindable` list / list-op must get its mount hook too, else dynamically
    // inserted rows never run onExoMount (e.g. a virtual list scrolling new rows in
    // would never wire their per-row subscriptions).
    //
    // Drained in batches: a hook is free to build more DOM (which queues onto a
    // fresh array), and those nested mounts fire before this returns.
    private flushMounts(): void {
        while (this.pendingMounts.length > 0) {
            const batch = this.pendingMounts;
            this.pendingMounts = [];
            for (let i = 0; i < batch.length; i++) {
                const schema = batch[i];
                const rec = schema.exoRecord;
                const onMount = (rec?.lifecycle ?? schema).attrs?.static?.onExoMount;
                if (typeof onMount === 'function') {
                    onMount(this.targetFor(schema));
                }
            }
        }
    }

    /**
     * Dispose the whole subtree (disposers + onExoUnmount, recursively) and
     * detach the root from the DOM.
     */
    public dispose(): void {
        this.disposeSchema(this.schema, true);

        // Records are NOT cleared off the schemas: they hang on `exoRecord`, so they
        // are reclaimed with the schemas themselves — the same lifetime the WeakMap
        // gave them. Walking the tree to null every slot would cost exactly the
        // traversal this renderer works to avoid, and buys nothing. A schema mounted
        // again after dispose simply overwrites its record (its element is detached
        // by then, so the two-live-positions guard does not trip).

        // Remove from DOM (a DocumentFragment root is detached by mount()).
        if (
            this.element &&
            !(this.element instanceof DocumentFragment) &&
            this.element.parentNode
        ) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Per-component build context as a single allocation: the methods live on the
// prototype rather than being re-created as closures for every component
// invocation. provide()/inject() walk the chained build scope; onDispose()
// registers against the owner node's record. Context methods are only ever
// called as ctx.method() (verified across the codebase), so prototype dispatch
// is safe — destructuring them would lose `this`.
class ExoBuildContext {
    readonly createNode = sharedCreateNode;

    // Allocated lazily on the first provide() call — a component that never
    // provides costs no scope object. `effectiveScope` (read back by the build
    // loop so children see provided values) is the own scope if one was created,
    // otherwise the parent scope.
    private ownScope?: TExoBuildScope;

    constructor(
        private readonly owner: ExoNodeDom,
        readonly schema: TExoNodeDomSchema,
        private readonly parentScope: TExoBuildScope | undefined,
        private readonly keySchema: TExoNodeDomSchema
    ) {}

    get effectiveScope(): TExoBuildScope | undefined {
        return this.ownScope ?? this.parentScope;
    }

    getConstant(name: string): unknown {
        return this.schema.attrs?.static?.[name];
    }

    getBindable(name: string): unknown {
        return this.schema.attrs?.bindables?.[name];
    }

    getBindableList(name: string): unknown {
        return this.schema.attrs?.bindableLists?.[name];
    }

    provide(key: { id: symbol }, value: unknown): void {
        const scope = (this.ownScope ??= { parent: this.parentScope });
        (scope.values ??= new Map()).set(key.id, value);
    }

    inject(key: { id: symbol }, fallback?: unknown): unknown {
        return injectFromScope(this.effectiveScope, key.id, fallback);
    }

    onDispose(cleanup: () => void): void {
        (this.owner.record(this.keySchema).disposers ??= []).push(cleanup);
    }
}
