import type { TExoComponent } from './types/TExoComponent';
import type { TExoContext } from './types/TExoContext';
import type { TExoContextKey } from './types/TExoContextKey';
import type { TExoNodeSchema } from './types/TExoNodeSchema';

export class ExoNode<TSchema extends TExoNodeSchema = TExoNodeSchema> {
    private _childNodes?: Array<this>;
    private _disposers?: Array<() => void>;
    private detachedChildNodes?: Array<this>;
    private detachedChildNodesBySchema?: WeakMap<TSchema, Array<this>>;
    private contextValues?: Map<symbol, unknown>;
    private reusableChildNodesCache?: Map<TSchema, this[]>;

    constructor(
        public readonly schema: TSchema,
        protected readonly parentNode?: ExoNode<TSchema>,
        autoInit = true
    ) {

        if (autoInit) {
            this.init();
        }
    }

    protected get childNodes(): Array<this> {
        return this._childNodes || (this._childNodes = []);
    }

    protected get disposers(): Array<() => void> {
        return this._disposers || (this._disposers = []);
    }

    get children(): readonly this[] {
        return this._childNodes || [];
    }

    dispose(): void {
        if (this._childNodes) {
            for (const childNode of this._childNodes) {
                childNode.dispose();
            }
            this._childNodes.length = 0;
        }

        if (this.detachedChildNodes) {
            for (const childNode of this.detachedChildNodes.splice(0)) {
                childNode.dispose();
            }
        }

        if (this._disposers) {
            for (const dispose of this._disposers.splice(0)) {
                dispose();
            }
        }

        this.onDispose();
    }

    protected init(): void {
        this.onInit();
        this.setChildren(this.resolveChildren());
    }

    protected initSubtreeIterative(): void {
        // Use two stacks to avoid object allocation
        const nodeStack: ExoNode<TSchema>[] = [this];
        const phaseStack: number[] = [0]; // 0 = enter, 1 = exit
        const exitNodes: ExoNode<TSchema>[] = [];
        const exitIndices: number[] = [];

        while (nodeStack.length > 0) {
            const node = nodeStack.pop()!;
            const phase = phaseStack.pop()!;

            if (phase === 1) {
                // Exit phase
                node.onChildrenReplaced([], node.children);
                continue;
            }

            // Enter phase
            node.onInit();

            const children = node.resolveChildren();
            const childCount = children.length;
            
            if (childCount > 0) {
                // Schedule exit phase for this node
                exitNodes.push(node);
                exitIndices.push(nodeStack.length);
                
                // Create and add children
                for (let i = 0; i < childCount; i++) {
                    const childNode = node.createNode(children[i], false);
                    node.childNodes.push(childNode);
                    
                    // Add child to stack for processing
                    nodeStack.push(childNode);
                    phaseStack.push(0);
                }
            } else {
                // No children, can call exit immediately
                node.onChildrenReplaced([], node.children);
            }
        }
        
        // Process exit phases in reverse order
        for (let i = exitNodes.length - 1; i >= 0; i--) {
            exitNodes[i].onChildrenReplaced([], exitNodes[i].children);
        }
    }

    protected onInit(): void {}

    protected onDispose(): void {}

    protected onChildrenReplaced(
        _previousChildNodes: readonly this[],
        _nextChildNodes: readonly this[]
    ): void {}

    protected onChildrenInserted(_index: number, _childNodes: readonly this[]): void {}

    protected onChildrenRemoved(_index: number, _childNodes: readonly this[]): void {}

    protected onChildrenMoved(
        _from: number,
        _to: number,
        _count: number,
        _childNodes: readonly this[]
    ): void {}

    protected onChildSet(_index: number, _childNode: this): void {}

    protected onChildChanged(_childNode: ExoNode<TSchema>): void {
        this.notifyChanged();
    }

    protected addDisposer(dispose: () => void): void {
        this.disposers.push(dispose);
    }

    protected notifyChanged(): void {
        this.parentNode?.onChildChanged(this);
    }

    protected createNode(schema: TSchema, autoInit = true): this {
        const NodeConstructor = this.constructor as new (
            schema: TSchema,
            parentNode?: ExoNode<TSchema>,
            autoInit?: boolean
        ) => this;
        return new NodeConstructor(schema, this, autoInit);
    }

    protected resolveChildren(): readonly TSchema[] {
        const type = this.schema.type;

        if (typeof type !== 'function') {
            return [];
        }

        return this.normalizeChildren(
            (type as TExoComponent<TSchema, TSchema>)(
                this.createContext()
            )
        );
    }

    protected setChildren(children: readonly TSchema[]): void {
        if (this.hasSameChildSchemas(children)) {
            return;
        }

        const previousChildNodes = this._childNodes ? this.childNodes.splice(0) : [];
        if (previousChildNodes.length === 0) {
            const nextChildNodes: this[] = [];
            for (const child of children) {
                nextChildNodes.push(
                    !this.detachedChildNodes?.length
                        ? this.createNode(child)
                        : this.takeDetachedChildNode(child) ?? this.createNode(child)
                );
            }

            for (const childNode of nextChildNodes) {
                this.childNodes.push(childNode);
            }
            this.onChildrenReplaced(previousChildNodes, nextChildNodes);
            return;
        }

        // Reuse Map instead of creating new one
        if (!this.reusableChildNodesCache) {
            this.reusableChildNodesCache = new Map();
        } else {
            this.reusableChildNodesCache.clear();
        }
        
        // Fill reusable map
        for (const childNode of previousChildNodes) {
            const bucket = this.reusableChildNodesCache.get(childNode.schema);
            if (bucket) {
                bucket.push(childNode);
            } else {
                this.reusableChildNodesCache.set(childNode.schema, [childNode]);
            }
        }
        
        const reusableChildNodes = this.reusableChildNodesCache;

        const nextChildNodes: this[] = [];
        for (const child of children) {
            nextChildNodes.push(
                this.takeReusableChildNode(reusableChildNodes, child) ??
                    this.takeDetachedChildNode(child) ??
                    this.createNode(child)
            );
        }

        for (const childNode of nextChildNodes) {
            this.childNodes.push(childNode);
        }
        const nextChildNodeSet = new Set(nextChildNodes);
        for (const childNode of previousChildNodes) {
            if (!nextChildNodeSet.has(childNode)) {
                this.cacheDetachedChildNode(childNode);
            }
        }
        this.onChildrenReplaced(previousChildNodes, nextChildNodes);
    }

    protected insertChildren(index: number, children: readonly TSchema[]): void {
        // Fast path for valid index
        const length = this._childNodes?.length ?? 0;
        if (index < 0 || index > length) {
            index = Math.max(0, Math.min(index, length));
        }
        
        // Create and insert nodes
        const childNodes: this[] = [];
        for (let i = 0; i < children.length; i++) {
            const node = this.createNode(children[i]);
            childNodes.push(node);
            this.childNodes.splice(index + i, 0, node);
        }
        
        this.onChildrenInserted(index, childNodes);
    }

    protected removeChildren(index: number, count = 1): void {
        if (!this._childNodes || this._childNodes.length === 0) return;
        
        // Fast validation
        if (index < 0 || index >= this._childNodes.length) {
            index = Math.max(0, Math.min(index, this._childNodes.length));
        }
        
        const actualCount = Math.min(count, this._childNodes.length - index);
        if (actualCount <= 0) return;
        
        const removedNodes = this.childNodes.splice(index, actualCount);

        for (const childNode of removedNodes) {
            childNode.dispose();
        }

        this.onChildrenRemoved(index, removedNodes);
    }

    protected moveChildren(from: number, to: number, count = 1): void {
        if (!this._childNodes || count <= 0 || from < 0 || from >= this._childNodes.length) {
            return;
        }

        const actualCount = Math.min(count, this._childNodes.length - from);
        
        // Store nodes to move
        const movedNodes: this[] = [];
        for (let i = 0; i < actualCount; i++) {
            movedNodes.push(this.childNodes[from + i]);
        }
        
        // Remove from old position
        this.childNodes.splice(from, actualCount);

        // Insert at `to` on the post-removal array. This matches the bindable
        // list's move() semantics, which already clamps `to` to the post-removal
        // length before emitting the op — so no extra `to - count` adjustment.
        const targetIndex = Math.min(Math.max(to, 0), this.childNodes.length);

        // Insert at new position one by one (avoid spread)
        for (let i = 0; i < movedNodes.length; i++) {
            this.childNodes.splice(targetIndex + i, 0, movedNodes[i]);
        }
        
        this.onChildrenMoved(from, targetIndex, actualCount, movedNodes);
    }

    protected setChild(index: number, child: TSchema): void {
        if (!this._childNodes || index < 0 || index >= this._childNodes.length) {
            return;
        }

        const previousChildNode = this._childNodes[index];
        if (previousChildNode?.schema === child) {
            return;
        }

        previousChildNode?.dispose();

        const childNode = this.createNode(child);
        this.childNodes[index] = childNode;
        this.onChildSet(index, childNode);
    }

    protected createContext(): TExoContext<TSchema> {
        return {
            schema: this.schema,
            createNode: <TNodeSchema extends TExoNodeSchema>(schema: TNodeSchema): TNodeSchema => schema,
            getConstant: (name: string) => this.getAttributeBucketValue('static', name),
            getBindable: (name: string) => this.getAttributeBucketValue('bindables', name),
            getBindableList: (name: string) => this.getAttributeBucketValue('bindableLists', name),
            provide: <T>(key: TExoContextKey<T>, value: T) => this.setContextValue(key, value),
            inject: <T>(key: TExoContextKey<T>, fallback?: T) => {
                const value = this.getContextValue(key);
                return value === undefined ? fallback : value;
            },
            onDispose: (cleanup: () => void) => this.addDisposer(cleanup),
        };
    }

    private getAttributeBucketValue<TValue>(
        bucketName: 'static' | 'bindables' | 'bindableLists',
        name: string
    ): TValue | undefined {
        const bucket = (this.schema.attrs as Record<string, unknown>)[bucketName];
        if (!bucket || typeof bucket !== 'object') {
            return undefined;
        }

        return (bucket as Record<string, TValue>)[name];
    }

    private setContextValue<TValue>(
        key: TExoContextKey<TValue>,
        value: TValue
    ): void {
        this.contextValues ??= new Map();
        this.contextValues.set(key.id, value);
    }

    private getContextValue<TValue>(
        key: TExoContextKey<TValue>
    ): TValue | undefined {
        if (this.contextValues?.has(key.id)) {
            return this.contextValues.get(key.id) as TValue;
        }

        for (
            let current = this.parentNode;
            current;
            current = current.parentNode
        ) {
            if (current.contextValues?.has(key.id)) {
                return current.contextValues.get(key.id) as TValue;
            }
        }

        return undefined;
    }

    protected normalizeChildren(
        children: TSchema | readonly TSchema[]
    ): readonly TSchema[] {
        if (children == null || typeof children === 'boolean') return [];
        if (!Array.isArray(children)) return [children as TSchema];

        // Fast path: already a clean list (no nested arrays / nullish / boolean
        // holes) — return as-is. Primitives are left for subclasses to textify.
        let needsWork = false;
        for (let i = 0; i < children.length; i++) {
            const c = children[i];
            if (c == null || typeof c === 'boolean' || Array.isArray(c)) {
                needsWork = true;
                break;
            }
        }
        if (!needsWork) return children as readonly TSchema[];

        // Flatten nested arrays and drop nullish/boolean holes — the shapes JSX
        // `.map()` siblings and `{cond && <x/>}` conditionals produce.
        const out: TSchema[] = [];
        const push = (c: unknown): void => {
            if (c == null || typeof c === 'boolean') return;
            if (Array.isArray(c)) {
                for (let i = 0; i < c.length; i++) push(c[i]);
                return;
            }
            out.push(c as TSchema);
        };
        for (let i = 0; i < children.length; i++) push(children[i]);
        return out;
    }


    private hasSameChildSchemas(children: readonly TSchema[]): boolean {
        if (!this._childNodes) {
            return children.length === 0;
        }
        
        if (this._childNodes.length !== children.length) {
            return false;
        }

        for (let i = 0; i < children.length; i++) {
            if (this._childNodes[i]?.schema !== children[i]) {
                return false;
            }
        }

        return true;
    }


    private takeReusableChildNode(
        childNodesBySchema: Map<TSchema, this[]>,
        schema: TSchema
    ): this | undefined {
        const childNodes = childNodesBySchema.get(schema);
        const childNode = childNodes?.shift();

        if (childNodes?.length === 0) {
            childNodesBySchema.delete(schema);
        }

        return childNode;
    }

    private cacheDetachedChildNode(childNode: this): void {
        this.detachedChildNodes ??= [];
        this.detachedChildNodesBySchema ??= new WeakMap();

        const bucket = this.detachedChildNodesBySchema.get(childNode.schema);
        if (bucket) {
            bucket.push(childNode);
        } else {
            this.detachedChildNodesBySchema.set(childNode.schema, [childNode]);
        }

        this.detachedChildNodes.push(childNode);
    }

    private takeDetachedChildNode(schema: TSchema): this | undefined {
        const childNodes = this.detachedChildNodesBySchema?.get(schema);
        if (!childNodes) {
            return undefined;
        }

        const childNode = childNodes.pop();

        if (!childNode) {
            return undefined;
        }

        if (childNodes.length === 0) {
            this.detachedChildNodesBySchema?.delete(schema);
        }

        const index = this.detachedChildNodes?.indexOf(childNode) ?? -1;
        if (index !== -1) {
            this.detachedChildNodes?.splice(index, 1);
        }

        return childNode;
    }


}
