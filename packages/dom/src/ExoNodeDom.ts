/**
 * ExoNodeDom — single-node DOM renderer. One node owns its whole subtree,
 * keyed off the schema objects, built via the core walkSchema traversal.
 */

import {
    walkSchema,
    type TExoWalkNode,
    type TExoContext,
    type TExoNodeSchema,
    type TExoSchema,
} from '@exodra/core';
import type {
    TExoBindable,
    TExoBindableList,
    TExoListOp,
} from '@exodra/reactivity-types';
import { __DEV__, describeSchema, devWarnOnce } from './dev';

// Component provide()/inject() scope, chained parent->child during the build walk
// (the single-node model has no per-node tree to carry context, so we thread it).
interface TExoBuildScope {
    values?: Map<symbol, unknown>;
    parent?: TExoBuildScope;
}

interface TExoBuildContext {
    element: Element | Text | Comment | DocumentFragment;
    scope?: TExoBuildScope;
}

export type TExoNodeDomSchema = TExoNodeSchema<TExoSchema['type'], TDomAttributes>;

// Lifecycle hooks receive the element they are attached to. In the single-node
// model the root passes `this` (an ExoNodeDom, which has `.element`); descendants
// pass a lightweight { element } handle.
export interface TExoDomMountTarget {
    element: Element | Text | Comment;
}

type TDomAttributes = {
    static?: Record<string, unknown> & {
        children?: TExoNodeDomSchema | readonly TExoNodeDomSchema[];
        onExoMount?: (node: TExoDomMountTarget) => void;
        onExoUnmount?: (node: TExoDomMountTarget) => void;
        textContent?: unknown;
    };
    bindables?: Record<string, TExoBindable<unknown, unknown>> & {
        children?: TExoBindable<
            TExoNodeDomSchema | readonly TExoNodeDomSchema[],
            unknown
        >;
        textContent?: TExoBindable<unknown, unknown>;
    };
    bindableLists?: Record<string, TExoBindableList<unknown, unknown>> & {
        children?: TExoBindableList<
            TExoNodeDomSchema,
            TExoListOp<TExoNodeDomSchema>
        >;
    };
    handlers?: Record<string, (event: Event) => void>;
    bindableHandlers?: Record<string, TExoBindable<(event: Event) => void, unknown>>;
};

// Per-schema bookkeeping, kept in ONE WeakMap (cheaper than 3-4 parallel maps).
// The key is always the ORIGINAL schema (what parents / this.schema reference);
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
    }) as TExoWalkNode<TExoNodeDomSchema, TExoBuildContext>;

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
// WeakMap records) is entirely its own.
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

    // One map per node: element + children + disposers + (resolved) lifecycle schema.
    private nodes = new WeakMap<TExoNodeDomSchema, TExoNodeRecord>();

    // Single-slot cache for the most recent record() lookup. buildTree resolves a
    // node's record and then setupBindings resolves the same one again — this
    // collapses that pair (and other adjacent same-schema lookups) to one get.
    private lastSchema?: TExoNodeDomSchema;
    private lastRecord?: TExoNodeRecord;

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

    private record(schema: TExoNodeDomSchema): TExoNodeRecord {
        if (schema === this.lastSchema && this.lastRecord) {
            return this.lastRecord;
        }
        let rec = this.nodes.get(schema);
        if (!rec) this.nodes.set(schema, (rec = {}));
        this.lastSchema = schema;
        this.lastRecord = rec;
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

            // A REACTIVE fragment (`<>{list}</>` / `<>{signal}</>`) must, like the
            // client build path, bracket its server-rendered run with start/end
            // comment anchors and subscribe — otherwise its children are hydrated
            // once and then frozen (list/signal updates would have no anchors to
            // reconcile between). Static fragments stay anchor-free (transparent).
            const childBindable = resolved.attrs?.bindables?.children;
            const childList = resolved.attrs?.bindableLists?.children;
            const reactive =
                (childBindable != null && 'subscribe' in childBindable) ||
                (childList != null && 'subscribeOps' in childList);

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

    /** @internal — used by ExoBuildContext.onDispose */
    recordFor(schema: TExoNodeDomSchema): TExoNodeRecord {
        return this.record(schema);
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
        parentScope?: TExoBuildScope
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
            const element = this.createDomElement(rootSchema);
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
                    let entry = cloneCache.get(key);
                    if (!entry) {
                        const holes: number[][] = [];
                        const skeleton = this.buildSkeleton(schema, [], holes);
                        if (!(skeleton instanceof Element)) {
                            // #text root: nothing to clone-cache, use as-is.
                            if (parentEl) this.domInsert(parentEl, skeleton, null);
                            node.element = skeleton;
                            node.scope = scope;
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
                    // Reactive children on a fragment (`bindables.children` /
                    // `bindableLists.children`): the fragment has no host element to
                    // reconcile INTO, so bracket its children with comment anchors in
                    // the parent and reconcile that range on update. Built manually
                    // (not via the walk) so insertion lands before the end anchor.
                    if (fa?.bindables?.children || fa?.bindableLists?.children) {
                        this.buildReactiveFragment(schema, container, scope);
                        return;
                    }
                    node.children = this.childrenOf(schema, fa?.static?.children);
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
                        return;
                    }
                    resolved = result;
                }

                // Always create a new element - can't reuse the same DOM node
                const element = this.createDomElement(resolved);
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
                if (element instanceof Element) {
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
        holes: number[][]
    ): Element | Text {
        if (schema.type === '#text') {
            return document.createTextNode(
                String(schema.attrs?.static?.textContent ?? '')
            );
        }
        const element = document.createElement(schema.type as string);
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
                this.buildSkeleton(staticChildren[i], path, holes)
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
        schema: TExoNodeDomSchema
    ): Element | Text | Comment {
        const type = schema.type;
        if (type === '#text') {
            return document.createTextNode(
                String(schema.attrs?.static?.textContent ?? '')
            );
        }
        if (type === '#comment') {
            return document.createComment('component');
        }
        if (typeof type === 'string') {
            return document.createElement(type);
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
        const keys = Object.keys(staticAttrs);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            // Non-attribute static keys, dispatched inline (no Set lookup): capture
            // children for the caller, set textContent, ignore lifecycle hooks.
            if (key === 'children') {
                children = staticAttrs.children;
            } else if (key === 'textContent') {
                element.textContent = String(staticAttrs.textContent);
            } else if (key === 'onExoMount' || key === 'onExoUnmount') {
                // read by setupBindings / disposeSchema, not a DOM attribute
            } else {
                this.writeAttr(element, key, staticAttrs[key]);
            }
        }
        return children;
    }

    // Apply one attribute value (string/boolean/null) — shared by static + bound.
    private writeAttr(element: Element, key: string, value: unknown): void {
        if (key === 'className') {
            element.className = String(value ?? '');
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
                const binding = bindables[key] as
                    | (TExoBindable<unknown, unknown> & {
                          getValue(): unknown;
                          subscribe(cb: () => void): () => void;
                      })
                    | undefined;
                if (!binding || typeof binding !== 'object' || !('subscribe' in binding)) {
                    if (__DEV__ && binding != null) {
                        devWarnOnce(
                            `[exodra] bindables.${key} on ${describeSchema(schema)} ` +
                                `is not a bindable (got a ${typeof binding}); it was ` +
                                `ignored, so this will not react. Pass a bindable ` +
                                `(signal) — a plain constant belongs in static, a ` +
                                `function in handlers.`
                        );
                    }
                    continue;
                }
                if (key === 'children') continue; // handled separately
                if (key === 'textContent') {
                    const el = element as Text | Element;
                    const b = binding;
                    el.textContent = String(b.getValue());
                    disposers.push(b.subscribe(() => {
                        el.textContent = String(b.getValue());
                    }));
                } else if (isElement) {
                    const el = element as Element;
                    const b = binding;
                    const k = key;
                    this.writeAttr(el, k, b.getValue());
                    disposers.push(b.subscribe(() => {
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
                if (typeof handler !== 'function') {
                    if (__DEV__ && handler != null) {
                        devWarnOnce(
                            `[exodra] handlers.${name} on ${describeSchema(schema)} ` +
                                `is not a function (got a ${typeof handler}); the ` +
                                `listener was not attached. Pass a function, or use ` +
                                `bindableHandlers for a reactive handler.`
                        );
                    }
                    continue;
                }
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
                          subscribe(cb: () => void): () => void;
                      }
                    | undefined;
                if (!binding || typeof binding !== 'object' || !('subscribe' in binding)) {
                    if (__DEV__ && binding != null) {
                        devWarnOnce(
                            `[exodra] bindableHandlers.${name} on ` +
                                `${describeSchema(schema)} is not a bindable (got a ` +
                                `${typeof binding}); the listener was not attached. ` +
                                `Pass a bindable holding a function, or use handlers ` +
                                `for a plain function.`
                        );
                    }
                    continue;
                }
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
                disposers.push(binding.subscribe(update));
            }
        }

        const childBindable = bindables?.children as
            | { getValue(): unknown; subscribe(cb: () => void): () => void }
            | undefined;
        if (childBindable && 'subscribe' in childBindable) {
            disposers.push(
                childBindable.subscribe(() =>
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
            | { subscribeOps(cb: (op: TExoListOp<TExoNodeDomSchema>) => void): () => void }
            | undefined;
        if (childList && 'subscribeOps' in childList) {
            disposers.push(
                childList.subscribeOps(op =>
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
        if (childList && 'snapshot' in childList) {
            return (
                childList as unknown as { snapshot(): TExoNodeDomSchema[] }
            ).snapshot();
        }

        const childBinding = a?.bindables?.children;
        if (childBinding && 'getValue' in childBinding) {
            return this.normalizeChildren(
                (childBinding as { getValue(): unknown }).getValue() as
                    | TExoNodeDomSchema
                    | readonly TExoNodeDomSchema[]
            );
        }

        if (staticRaw == null) return [];
        return this.normalizeChildren(
            staticRaw as TExoNodeDomSchema | readonly TExoNodeDomSchema[]
        );
    }

    // The element a lifecycle hook for `schema` is attached to.
    private targetFor(schema: TExoNodeDomSchema): TExoDomMountTarget {
        const element = this.nodes.get(schema)?.element ?? this.element;
        return { element: element as Element | Text | Comment };
    }

    // Unmount a schema subtree: run + clear its disposers, fire onExoUnmount, then
    // recurse. Used for full dispose AND for list/child removals (the element may
    // still be reused later, hence disposers are cleared so re-binding is clean).
    private disposeSchema(schema: TExoNodeDomSchema): void {
        const rec = this.nodes.get(schema);
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
            for (let i = 0; i < children.length; i++) this.disposeSchema(children[i]);
        }
    }

    protected normalizeChildren(
        children: TExoNodeDomSchema | readonly TExoNodeDomSchema[]
    ): TExoNodeDomSchema[] {
        if (children == null || typeof children === 'boolean') return [];
        if (!Array.isArray(children)) {
            const t = typeof children;
            if (t === 'string' || t === 'number') {
                return [textSchema(children as unknown as string | number)];
            }
            return [children as TExoNodeDomSchema];
        }

        // Fast path: an array that is already a clean list of schema objects (the
        // common case — a bindableList snapshot, or static children with no
        // primitives / nested arrays / falsy holes) is returned as-is, no alloc.
        let needsWork = false;
        for (let i = 0; i < children.length; i++) {
            const c = children[i];
            const t = typeof c;
            if (
                c == null ||
                t === 'boolean' ||
                t === 'string' ||
                t === 'number' ||
                Array.isArray(c)
            ) {
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
                t === 'string' || t === 'number'
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
            | { getValue(): unknown; subscribe(cb: () => void): () => void }
            | undefined;
        if (b && 'subscribe' in b) {
            disposers.push(
                b.subscribe(() =>
                    this.updateFragmentChildren(recordKey, b.getValue())
                )
            );
        }
        const l = childList as
            | { snapshot(): TExoNodeDomSchema[]; subscribeOps(cb: () => void): () => void }
            | undefined;
        if (l && 'subscribeOps' in l) {
            disposers.push(
                l.subscribeOps(() =>
                    this.updateFragmentChildren(recordKey, l.snapshot())
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
            this.domInsert(parent, this.buildListItem(initial[i], scope), end);
        }
        rec.children = initial;

        const disposers = rec.disposers ?? (rec.disposers = []);
        const childBindable = schema.attrs?.bindables?.children as
            | { getValue(): unknown; subscribe(cb: () => void): () => void }
            | undefined;
        if (childBindable && 'subscribe' in childBindable) {
            disposers.push(
                childBindable.subscribe(() =>
                    this.updateFragmentChildren(schema, childBindable.getValue())
                )
            );
        }
        const childList = schema.attrs?.bindableLists?.children as
            | { snapshot(): TExoNodeDomSchema[]; subscribeOps(cb: () => void): () => void }
            | undefined;
        if (childList && 'subscribeOps' in childList) {
            // No host element for the O(1) list ops, so reconcile to the full
            // snapshot on each op — correct; reactive lists on a bare fragment are rare.
            disposers.push(
                childList.subscribeOps(() =>
                    this.updateFragmentChildren(schema, childList.snapshot())
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

        const normalized = this.normalizeChildren(
            newChildren as TExoNodeDomSchema | readonly TExoNodeDomSchema[]
        );
        const oldSchemas = rec.children ?? [];

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
            const existingEl = this.nodes.get(childSchema)?.element;
            if (existingEl) {
                newElements[i] =
                    existingEl.parentNode === parent
                        ? (existingEl as Element | Text | Comment)
                        : this.reattach(childSchema);
            } else {
                newElements[i] = this.buildListItem(childSchema, rec.scope);
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
        for (let i = 0; i < built.length; i++) this.commitMountFrom(built[i]);
    }

    private updateChildren(
        schema: TExoNodeDomSchema,
        element: Element,
        newChildren: unknown
    ): void {
        const normalized = this.normalizeChildren(
            newChildren as TExoNodeDomSchema | readonly TExoNodeDomSchema[]
        );
        const rec = this.record(schema);
        const oldSchemas = rec.children ?? [];
        const n = normalized.length;

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
            const existingEl = this.nodes.get(childSchema)?.element;
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
                newElements[i] = this.buildListItem(childSchema, rec.scope);
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
                    const gone = this.nodes.get(os)?.element;
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
        for (let i = 0; i < built.length; i++) this.commitMountFrom(built[i]);
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
                const childToRemove = element.childNodes[index];
                const schemaToRemove = current[index + i];
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
            const element0 = this.reuseOrBuild(newSchema, rec.scope);
            const nextSibling = element.childNodes[index];
            this.domInsert(element, element0, nextSibling ?? null);
            current.splice(index, 0, newSchema);
            return;
        }

        if (op.type === 'set') {
            const index = op.index;
            if (index < 0 || index >= current.length) return;
            const oldChild = element.childNodes[index];
            this.disposeSchema(current[index]);
            const newElement = this.reuseOrBuild(op.item, rec.scope);
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

            const elementsToMove: ChildNode[] = [];
            for (let i = 0; i < actualCount; i++) {
                const elementToMove = element.childNodes[from];
                if (elementToMove) {
                    elementsToMove.push(elementToMove);
                    this.domRemove(element, elementToMove);
                }
            }
            const moved = current.splice(from, actualCount);
            current.splice(actualTo, 0, ...moved);

            const insertBeforeNode = element.childNodes[actualTo] ?? null;
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
        scope?: TExoBuildScope
    ): Element | Text | Comment {
        const existing = this.nodes.get(schema)?.element;
        if (existing && !existing.parentNode) {
            return this.reattach(schema);
        }
        return this.buildListItem(schema, scope);
    }

    // buildTree for a reactive-list ITEM: the reconcile assumes one DOM node per
    // item, so a multi-node result (a #fragment / a component resolving to one)
    // must fail loudly rather than silently corrupt sibling positions.
    private buildListItem(
        schema: TExoNodeDomSchema,
        scope?: TExoBuildScope
    ): Element | Text | Comment {
        const node = this.buildTree(schema, scope);
        if (node instanceof DocumentFragment) {
            throw new Error(FRAGMENT_LIST_ITEM_ERROR);
        }
        return node as Element | Text | Comment;
    }

    // Re-establish bindings across a previously-built, now-detached subtree. Runs
    // recursively so deep bindables (textContent/attrs catch up via the immediate
    // update()) and deep event handlers (re-added) come back to life.
    private reattach(schema: TExoNodeDomSchema): Element | Text | Comment {
        const rec = this.nodes.get(schema)!;
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
        this.commitMountFrom(this.schema);
    }

    // Fire onExoMount across a subtree (parent-first). Used at initial mount (from
    // the root) and for nodes built LATER by a reactive update — a child entering
    // a `bindable` list / list-op must get its mount hook too, else dynamically
    // inserted rows never run onExoMount (e.g. a virtual list scrolling new rows
    // in would never wire their per-row subscriptions).
    private commitMountFrom(root: TExoNodeDomSchema): void {
        const stack: TExoNodeDomSchema[] = [root];
        while (stack.length > 0) {
            const schema = stack.pop()!;
            const rec = this.nodes.get(schema);
            const onMount = (rec?.lifecycle ?? schema).attrs?.static?.onExoMount;
            if (typeof onMount === 'function') {
                onMount(this.targetFor(schema));
            }
            const children = rec?.children;
            if (children) {
                for (let i = 0; i < children.length; i++) stack.push(children[i]);
            }
        }
    }

    /**
     * Dispose the whole subtree (disposers + onExoUnmount, recursively) and
     * detach the root from the DOM.
     */
    public dispose(): void {
        this.disposeSchema(this.schema);

        // No need to clear `nodes`: it is a WeakMap keyed by schema objects, so
        // its records are reclaimed automatically once the schemas (and this node)
        // are unreferenced. Allocating a fresh WeakMap here just adds garbage.

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
        private readonly owner: ExoNodeDom & {
            recordFor(schema: TExoNodeDomSchema): TExoNodeRecord;
        },
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
        let current = this.effectiveScope;
        while (current) {
            if (current.values?.has(key.id)) {
                return current.values.get(key.id);
            }
            current = current.parent;
        }
        return fallback;
    }

    onDispose(cleanup: () => void): void {
        (this.owner.recordFor(this.keySchema).disposers ??= []).push(cleanup);
    }
}
