/**
 * ExoNodeDom — single-node DOM renderer. One node owns its whole subtree,
 * keyed off the schema objects, built via the core walkSchema traversal.
 */

import {
    ExoNode,
    walkSchema,
    type TExoContext,
    type TExoNodeSchema,
    type TExoSchema,
} from '@exodra/core';
import type {
    TExoBindable,
    TExoBindableList,
    TExoListOp,
} from '@exodra/reactivity';

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
}

// Static-attr names that are NOT DOM attributes and must be skipped when applying.
const NON_ATTR_STATIC = new Set([
    'children',
    'textContent',
    'onExoMount',
    'onExoUnmount',
]);

// Clone-cache for fully-static subtrees marked with a `cacheKey`: built once, then
// cloned for every later occurrence sharing the key. Global, bounded by the number
// of distinct keyed templates in the app.
const cloneCache = new Map<symbol | string, Element>();

// Identity createNode shared by every component context (schema IS the node in
// the single-node model).
const sharedCreateNode = (schema: unknown): unknown => schema;

// Wrap a primitive child (string/number) as a #text schema node.
const textSchema = (value: string | number): TExoNodeDomSchema =>
    ({
        type: '#text',
        attrs: { static: { textContent: String(value) } },
    }) as TExoNodeDomSchema;

export class ExoNodeDom extends ExoNode<TExoNodeDomSchema> {
    /**
     * Static hydrate method for SSR
     */
    static hydrate(
        schema: TExoNodeDomSchema,
        element: Element | ChildNode
    ): ExoNodeDom {
        const node = new ExoNodeDom(schema, undefined, false);
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

    constructor(
        schema: TExoNodeDomSchema,
        parentNode?: ExoNode<TExoNodeDomSchema>,
        autoInit = true
    ) {
        super(schema, parentNode, false);
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
            this.hydrateTree(this.schema, this.hydratedElement);
            return;
        }
        this.element = this.buildTree(this.schema);
    }

    /**
     * Hydrate existing DOM tree
     */
    private hydrateTree(
        schema: TExoNodeDomSchema,
        element: Element | Text | Comment
    ): void {
        const rec = this.record(schema);
        rec.element = element;

        this.setupBindings(schema, element);

        if (element instanceof Element) {
            const children = this.resolveChildrenForSchema(schema);
            const childNodes = element.childNodes;
            const count = Math.min(children.length, childNodes.length);
            for (let i = 0; i < count; i++) {
                this.hydrateTree(
                    children[i],
                    childNodes[i] as Element | Text | Comment
                );
            }
            rec.children = children;
        }
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
            throw new Error('DOM component nodes must return a single root schema');
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
        rootSchema: TExoNodeDomSchema
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
                    'ExoNodeDom: a schema object was rendered in two live ' +
                        'positions — schemas must be unique per position. ' +
                        'Use cache:key / cacheKey to repeat a static template.'
                );
            }
            rec.element = element;
            rec.lifecycle = rootSchema;
            this.applyAttributes(rootSchema, element);
            this.setupBindings(rootSchema, element, rootSchema);
            return element;
        }

        const root = walkSchema<TExoNodeDomSchema, TExoBuildContext>(
            rootSchema,
            (schema, parent, _index) => {
                const parentEl = parent?.element;
                // Lazy: a build scope is only allocated when a component actually
                // calls provide(). Non-component subtrees thread `undefined`.
                const scope = parent?.scope;

                // Cache-key clone path: developer guarantees this is static by providing key
                const key = schema.cacheKey;
                if (key !== undefined) {
                    const cached = cloneCache.get(key);
                    if (cached) {
                        const element = cached.cloneNode(true) as Element;
                        if (parentEl) (parentEl as DomParent).appendChild(element);
                        return { context: { element, scope }, children: [] };
                    }
                    // First occurrence: build and cache for cloning
                    const element = this.buildStatic(schema);
                    if (element instanceof Element) {
                        cloneCache.set(key, element.cloneNode(true) as Element);
                    }
                    if (parentEl) (parentEl as DomParent).appendChild(element);
                    return { context: { element, scope }, children: [] };
                }

                // Fragment: transparent — its children attach to the parent
                // (or a DocumentFragment when the fragment itself is the root).
                if (schema.type === '#fragment') {
                    const container: DomParent =
                        (parentEl as DomParent | undefined) ??
                        document.createDocumentFragment();
                    return {
                        context: { element: container, scope },
                        children: this.resolveChildrenForSchema(schema),
                    };
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
                        if (parentEl) (parentEl as DomParent).appendChild(comment);
                        return {
                            context: { element: comment, scope: currentScope },
                            children: [],
                        };
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
                        'ExoNodeDom: a schema object was rendered in two live ' +
                            'positions — schemas must be unique per position. ' +
                            'Use cache:key / cacheKey to repeat a static template.'
                    );
                }
                rec.element = element;
                rec.lifecycle = resolved;
                this.applyAttributes(resolved, element);
                this.setupBindings(resolved, element, schema);
                if (parentEl) (parentEl as DomParent).appendChild(element);

                let children: TExoNodeDomSchema[] = [];
                if (element instanceof Element) {
                    children = this.resolveChildrenForSchema(resolved);
                    if (children.length > 0) rec.children = children;
                }
                return { context: { element, scope: currentScope }, children };
            }
        );
        return root.element;
    }

    // Build a fully-static subtree as inert DOM — no per-node bookkeeping (there is
    // nothing to bind, dispose, or reconcile). Precondition: the schema carries a
    // `cacheKey`, which the compiler only assigns to provably-static subtrees.
    private buildStatic(schema: TExoNodeDomSchema): Element | Text {
        if (schema.type === '#text') {
            return document.createTextNode(
                String(schema.attrs?.static?.textContent ?? '')
            );
        }
        const element = document.createElement(schema.type as string);
        this.applyAttributes(schema, element);
        const children = this.resolveChildrenForSchema(schema);
        for (let i = 0; i < children.length; i++) {
            element.appendChild(this.buildStatic(children[i]));
        }
        return element;
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
            `Cannot create DOM element for schema type: ${String(type)}`
        );
    }

    private applyAttributes(
        schema: TExoNodeDomSchema,
        element: Element | Text | Comment
    ): void {
        const staticAttrs = schema.attrs?.static;
        if (!(element instanceof Element) || !staticAttrs) return;

        for (const key in staticAttrs) {
            if (NON_ATTR_STATIC.has(key)) {
                if (key === 'textContent') {
                    element.textContent = String(staticAttrs.textContent);
                }
                continue;
            }
            this.writeAttr(element, key, staticAttrs[key]);
        }
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
                if (typeof handler !== 'function') continue;
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
                    this.updateChildren(
                        schema,
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
                    this.applyListOp(schema, element as Element, op)
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

    private resolveChildrenForSchema(
        schema: TExoNodeDomSchema
    ): TExoNodeDomSchema[] {
        const childList = schema.attrs?.bindableLists?.children;
        if (childList && 'snapshot' in childList) {
            return (
                childList as unknown as { snapshot(): TExoNodeDomSchema[] }
            ).snapshot();
        }

        const childBinding = schema.attrs?.bindables?.children;
        if (childBinding && 'getValue' in childBinding) {
            return this.normalizeChildren(
                (childBinding as { getValue(): unknown }).getValue() as
                    | TExoNodeDomSchema
                    | readonly TExoNodeDomSchema[]
            );
        }

        const children = schema.attrs?.static?.children;
        if (!children) return [];
        return this.normalizeChildren(children);
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

    private updateChildren(
        schema: TExoNodeDomSchema,
        element: Element,
        newChildren: unknown
    ): void {
        const normalized = this.normalizeChildren(
            newChildren as TExoNodeDomSchema | readonly TExoNodeDomSchema[]
        );
        const existing = Array.from(element.childNodes);
        const rec = this.record(schema);
        const oldSchemas = rec.children ?? [];

        // Resolve the desired element for each new child (reuse where possible).
        // Track the ones we BUILD fresh this pass so their onExoMount fires after
        // they are attached (reused/moved nodes already mounted — don't re-fire).
        const newElements: (Element | Text | Comment)[] = new Array(
            normalized.length
        );
        const built: TExoNodeDomSchema[] = [];
        for (let i = 0; i < normalized.length; i++) {
            const childSchema = normalized[i];
            if (oldSchemas[i] === childSchema && existing[i]) {
                newElements[i] = existing[i] as Element | Text | Comment;
                continue;
            }
            const existingEl = this.nodes.get(childSchema)?.element;
            if (existingEl) {
                // Seen before. If it is STILL connected to this container its
                // bindings are already live (it only moved index) — reuse it as-is
                // and let the reorder pass below move it. Only a detached element
                // (show/hide / filtered-out-then-back) needs reattach to re-bind.
                // This is the hot path for filter/search: every kept row changes
                // index, and reattaching all of them would needlessly churn their
                // subscriptions.
                newElements[i] =
                    existingEl.parentNode === element
                        ? existingEl
                        : this.reattach(childSchema);
            } else {
                newElements[i] = this.buildTree(childSchema) as
                    | Element
                    | Text
                    | Comment;
                built.push(childSchema);
            }
        }

        // Dispose old children whose schema is gone (bindings + onExoUnmount).
        // Diff by schema identity — static clone children have no record, so
        // disposeSchema is a no-op for them (nothing to clean), which is correct.
        const nextSet = new Set(normalized);
        for (let i = 0; i < oldSchemas.length; i++) {
            if (!nextSet.has(oldSchemas[i])) this.disposeSchema(oldSchemas[i]);
        }

        // Remove DOM children not being kept. Scan the live children rather than
        // diffing by schema position: a single child schema can map to a different
        // number of DOM nodes (components, fragments), so existing[i] is NOT
        // guaranteed to line up with oldSchemas[i]. The keep-set scan is robust to
        // that; its cost is the removeChild calls themselves, not the set.
        const keep = new Set(newElements);
        for (let i = 0; i < existing.length; i++) {
            const child = existing[i] as Element | Text | Comment;
            if (!keep.has(child)) element.removeChild(child);
        }

        // Reorder/insert to match the new order. Walk right-to-left and position
        // each node relative to the previously-placed one via nextSibling (O(1)).
        // Indexing element.childNodes[i] instead would be a live-NodeList lookup —
        // O(n) per access in some engines — turning this into an O(n^2) loop. The
        // removal pass above already left only the nodes we keep, so the sibling
        // checks see a clean list.
        let after: ChildNode | null = null;
        for (let i = newElements.length - 1; i >= 0; i--) {
            const want = newElements[i];
            if (want.parentNode !== element || want.nextSibling !== after) {
                element.insertBefore(want, after);
            }
            after = want;
        }

        rec.children = normalized;

        // Freshly-built children are now attached — run their mount hooks.
        for (let i = 0; i < built.length; i++) this.commitMountFrom(built[i]);
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
                    element.removeChild(childToRemove);
                }
            }
            current.splice(index, actualCount);
            return;
        }

        if (op.type === 'insert') {
            const index = Math.min(op.index, current.length);
            const newSchema = op.item;
            const element0 = this.reuseOrBuild(newSchema);
            const nextSibling = element.childNodes[index];
            element.insertBefore(element0, nextSibling ?? null);
            current.splice(index, 0, newSchema);
            return;
        }

        if (op.type === 'set') {
            const index = op.index;
            if (index < 0 || index >= current.length) return;
            const oldChild = element.childNodes[index];
            this.disposeSchema(current[index]);
            const newElement = this.reuseOrBuild(op.item);
            if (oldChild) element.replaceChild(newElement, oldChild);
            else element.appendChild(newElement);
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
                    element.removeChild(elementToMove);
                }
            }
            const moved = current.splice(from, actualCount);
            current.splice(actualTo, 0, ...moved);

            const insertBeforeNode = element.childNodes[actualTo] ?? null;
            for (let i = 0; i < elementsToMove.length; i++) {
                element.insertBefore(elementsToMove[i], insertBeforeNode);
            }
            return;
        }

        // reset / unknown -> keyed reconcile against the full snapshot.
        this.updateChildren(schema, element, this.resolveChildrenForSchema(schema));
    }

    // Reuse a detached element for a schema if one exists, else build a fresh one.
    // A detached element keeps its DOM but its bindings were disposed on detach, so
    // reuse RE-BINDS the whole subtree (deep bindables + event handlers) — the same
    // schema is shown again without re-rendering.
    private reuseOrBuild(
        schema: TExoNodeDomSchema
    ): Element | Text | Comment {
        const existing = this.nodes.get(schema)?.element;
        if (existing && !existing.parentNode) {
            return this.reattach(schema);
        }
        return this.buildTree(schema) as Element | Text | Comment;
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
                this.resolveChildrenForSchema(src)
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
