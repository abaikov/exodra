import { ExoNode, type TExoNodeSchema, type TExoSchema } from '@exodra/core';
import type {
    TExoBindable,
    TExoBindableList,
    TExoListOp,
} from '@exodra/reactivity';

export type TExoNodeDomSchema = TExoNodeSchema<TExoSchema['type'], TDomAttributes>;

type TDomAttributes = {
    static?: Record<string, unknown> & {
        children?: TExoNodeDomSchema | readonly TExoNodeDomSchema[];
        onExoMount?: (node: ExoNodeDom) => void;
        onExoUnmount?: (node: ExoNodeDom) => void;
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

export class ExoNodeDom extends ExoNode<TExoNodeDomSchema> {
    element?: Element | Text | Comment;
    private hydrationChildIndex = 0;
    private hydratedChildNodes?: Array<Element | Text>;
    private hasStaticChildrenMounted = false;
    private isMounted = false;

    constructor(
        schema: TExoNodeDomSchema,
        parentNode?: ExoNode<TExoNodeDomSchema>,
        private readonly hydratedNode?: Element | Text | Comment,
        autoInit = true
    ) {
        super(schema, parentNode, false);
        if (autoInit) {
            this.initSubtreeIterative();
        }
    }

    static hydrate(schema: TExoNodeDomSchema, element: Element | Text | Comment): ExoNodeDom {
        return new ExoNodeDom(schema, undefined, element);
    }

    commitMount(): void {
        const stack: ExoNodeDom[] = [this];

        while (stack.length > 0) {
            const node = stack.pop();
            if (!node) {
                continue;
            }

            node.runMountLifecycle();

            for (let i = node.children.length - 1; i >= 0; i--) {
                stack.push(node.children[i]);
            }
        }
    }

    protected override onInit(): void {
        if (this.isComponentNode()) {
            this.element = this.hydratedNode;
            return;
        }

        this.element = this.hydratedNode ?? this.createElement();
        this.applyConstantAttributes();
        this.bindAttributes();
        this.attachHandlers();
        this.bindHandlers();
        this.mountStaticChildren();
        this.bindTextContent();
        this.bindChildren();
    }

    protected override onDispose(): void {
        if (!this.isMounted) {
            return;
        }

        this.schema.attrs?.static?.onExoUnmount?.(this);
        this.isMounted = false;
    }

    protected override createNode(
        schema: TExoNodeDomSchema,
        autoInit = true
    ): this {
        // Never create nodes for fragments - they're processed inline
        if (schema.type === '#fragment') {
            throw new Error('Fragment schemas should not create nodes');
        }
        
        const NodeConstructor = this.constructor as new (
            schema: TExoNodeDomSchema,
            parentNode?: ExoNode<TExoNodeDomSchema>,
            hydratedNode?: Element | Text | Comment,
            autoInit?: boolean
        ) => this;

        return new NodeConstructor(
            schema,
            this,
            this.takeHydrationChild(),
            autoInit
        );
    }

    protected override resolveChildren(): readonly TExoNodeDomSchema[] {
        // For component nodes, always defer to parent implementation
        // to ensure the component function is called
        if (this.isComponentNode()) {
            return super.resolveChildren();
        }
        
        if (!this.hydratedNode && this.canRenderStaticSubtree(this.schema)) {
            return [];
        }

        const childList = this.schema.attrs?.bindableLists?.children;
        if (childList) {
            return childList.snapshot();
        }

        const childBinding = this.schema.attrs?.bindables?.children;
        if (childBinding) {
            return this.normalizeChildren(childBinding.getValue());
        }

        const children = this.schema.attrs?.static?.children;

        if (children === undefined) {
            return super.resolveChildren();
        }

        // Process children and expand fragments inline
        return this.normalizeAndExpandChildren(children);
    }
    
    protected override normalizeChildren(
        children: TExoNodeDomSchema | readonly TExoNodeDomSchema[]
    ): readonly TExoNodeDomSchema[] {
        const normalized = super.normalizeChildren(children);
        // Convert string/number/bigint primitives to text schemas.
        return normalized.map(child => {
            const itemType = typeof child;
            return itemType === 'string' || itemType === 'number' || itemType === 'bigint'
                ? this.createTextSchema(String(child))
                : child;
        }) as readonly TExoNodeDomSchema[];
    }
    
    private normalizeAndExpandChildren(
        children: TExoNodeDomSchema | readonly TExoNodeDomSchema[]
    ): readonly TExoNodeDomSchema[] {
        const normalized = this.normalizeChildren(children);
        
        // Fast path: if no fragments, return as-is
        let hasFragments = false;
        for (const child of normalized) {
            if (child.type === '#fragment') {
                hasFragments = true;
                break;
            }
        }
        
        if (!hasFragments) {
            return normalized;
        }
        
        // Slow path: expand fragments
        const expanded: TExoNodeDomSchema[] = [];
        for (const child of normalized) {
            if (child.type === '#fragment') {
                const fragChildren = this.resolveFragmentSchema(child);
                if (fragChildren.length > 0) {
                    expanded.push(...fragChildren);
                }
            } else {
                expanded.push(child);
            }
        }
        
        return expanded;
    }
    
    private resolveFragmentSchema(fragment: TExoNodeDomSchema): readonly TExoNodeDomSchema[] {
        // Resolve bindable children
        const bindable = fragment.attrs?.bindables?.children;
        if (bindable) {
            const value = bindable.getValue();
            if (!value) return [];
            return this.normalizeChildren(value);
        }
        
        // Resolve list children
        const list = fragment.attrs?.bindableLists?.children;
        if (list) {
            return list.snapshot();
        }
        
        return [];
    }
    
    private createTextSchema(text: string): TExoNodeDomSchema {
        return {
            type: '#text',
            attrs: {
                static: {
                    textContent: text
                }
            }
        } as TExoNodeDomSchema;
    }

    protected override onChildrenReplaced(): void {
        if (this.isComponentNode()) {
            this.syncComponentElement();
            return;
        }

        this.replaceChildren();
    }

    protected override onChildrenInserted(
        index: number,
        childNodes: readonly this[]
    ): void {
        this.insertChildElements(index, childNodes);
    }

    protected override onChildrenRemoved(
        _index: number,
        childNodes: readonly this[]
    ): void {
        for (const childNode of childNodes) {
            childNode.element?.remove();
        }
    }

    protected override onChildrenMoved(
        _from: number,
        to: number,
        _count: number,
        childNodes: readonly this[]
    ): void {
        const element = this.getElement();

        if (!element) {
            return;
        }

        if (childNodes.length === 1) {
            const childElement = childNodes[0]?.element;
            if (childElement) {
                childElement.remove();
                element.insertBefore(childElement, element.childNodes[to] ?? null);
            }
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const childNode of childNodes) {
            if (childNode.element) {
                fragment.appendChild(childNode.element);
            }
        }

        element.insertBefore(fragment, element.childNodes[to] ?? null);
    }

    protected override onChildSet(index: number, childNode: this): void {
        if (this.isComponentNode()) {
            this.syncComponentElement();
            return;
        }

        const element = this.getElement();
        const childElement = childNode.element;

        if (!element || !childElement) {
            return;
        }

        const previousElement = element.childNodes[index];

        if (previousElement) {
            element.replaceChild(childElement, previousElement);
            return;
        }

        element.appendChild(childElement);
    }

    private bindTextContent(): void {
        const textContent = this.schema.attrs?.bindables?.textContent;

        if (!textContent || !this.element) {
            return;
        }

        const update = () => {
            if (this.element) {
                const nextTextContent = String(textContent.getValue() ?? '');
                if (this.element.textContent !== nextTextContent) {
                    this.element.textContent = nextTextContent;
                }
            }
        };

        update();
        this.addDisposer(textContent.subscribe(update));
    }

    private bindAttributes(): void {
        const bindables = this.schema.attrs?.bindables;
        const element = this.getElement();

        if (!bindables || !element) {
            return;
        }

        // Use for..in for better performance than Object.entries
        for (const name in bindables) {
            if (ExoNodeDom.skipAttributes.has(name)) {
                continue;
            }

            const valueBinding = bindables[name] as TExoBindable<unknown, unknown>;
            if (this.isEventName(name)) {
                this.bindEvent(element, name, valueBinding);
            } else {
                const update = () => {
                    this.applyDomValue(element, name, valueBinding.getValue());
                };

                update();
                this.addDisposer(valueBinding.subscribe(update));
            }
        }
    }

    private fragmentIndices?: Map<TExoNodeDomSchema, { start: number; count: number }>;
    
    private bindChildren(): void {
        // Track fragment positions for targeted updates
        const children = this.schema.attrs?.static?.children;
        if (children) {
            if (Array.isArray(children)) {
                let currentIndex = 0;
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    if (child.type === '#fragment') {
                        const fragment = child;
                        const startIndex = currentIndex;
                        
                        // Bind and track this fragment
                        this.bindFragmentSchema(fragment, startIndex, i);
                        
                        // Count how many children this fragment currently has
                        const fragChildren = this.resolveFragmentSchema(fragment);
                        currentIndex += fragChildren.length;
                    } else {
                        currentIndex++;
                    }
                }
            } else if ((children as TExoNodeDomSchema).type === '#fragment') {
                // `Array.isArray` does not narrow a readonly array out of the
                // union, so re-assert the single-schema type explicitly here.
                this.bindFragmentSchema(children as TExoNodeDomSchema, 0, 0);
            }
        }
        
        const childBinding = this.schema.attrs?.bindables?.children;
        if (childBinding) {
            const update = () => {
                this.setChildren(this.normalizeChildren(childBinding.getValue()));
            };

            this.addDisposer(childBinding.subscribe(update));
        }

        const childList = this.schema.attrs?.bindableLists?.children;
        if (childList) {
            this.addDisposer(
                childList.subscribeOps((op: TExoListOp<TExoNodeDomSchema>) => {
                    this.applyChildrenOp(op);
                })
            );
        }
    }
    
    private bindFragmentSchema(fragment: TExoNodeDomSchema, startIndex: number, schemaIndex: number): void {
        // Bind fragment's bindable with targeted updates
        const bindable = fragment.attrs?.bindables?.children;
        if (bindable) {
            let lastCount = 1;  // Track how many children this fragment has
            
            this.addDisposer(bindable.subscribe(() => {
                const newFragChildren = this.resolveFragmentSchema(fragment);
                const newCount = newFragChildren.length;
                
                // Calculate the range to update
                const adjustedStart = this.calculateFragmentStartIndex(schemaIndex);
                
                // Remove old children
                if (lastCount > 0) {
                    this.removeChildren(adjustedStart, lastCount);
                }
                
                // Insert new children
                if (newCount > 0) {
                    this.insertChildren(adjustedStart, newFragChildren);
                }
                
                lastCount = newCount;
            }));
        }
        
        // Bind fragment's list with operations
        const list = fragment.attrs?.bindableLists?.children;
        if (list) {
            this.addDisposer(list.subscribeOps((op: TExoListOp<TExoNodeDomSchema>) => {
                const adjustedStart = this.calculateFragmentStartIndex(schemaIndex);
                
                // Apply operation with adjusted index
                const adjustedOp = { ...op };
                if ('index' in adjustedOp) {
                    adjustedOp.index = adjustedOp.index + adjustedStart;
                }
                if ('from' in adjustedOp) {
                    adjustedOp.from = adjustedOp.from + adjustedStart;
                }
                if ('to' in adjustedOp) {
                    adjustedOp.to = adjustedOp.to + adjustedStart;
                }
                
                this.applyChildrenOp(adjustedOp);
            }));
        }
    }
    
    private calculateFragmentStartIndex(schemaIndex: number): number {
        // Calculate actual DOM index for fragment based on schema index
        const children = this.schema.attrs?.static?.children;
        if (!children || !Array.isArray(children)) return 0;
        
        let currentIndex = 0;
        for (let i = 0; i < schemaIndex; i++) {
            const child = children[i];
            if (child.type === '#fragment') {
                const fragChildren = this.resolveFragmentSchema(child);
                currentIndex += fragChildren.length;
            } else {
                currentIndex++;
            }
        }
        
        return currentIndex;
    }

    private applyChildrenOp(op: TExoListOp<TExoNodeDomSchema>): void {
        switch (op.type) {
            case 'insert':
                this.insertChildren(op.index, [op.item]);
                return;
            case 'remove':
                this.removeChildren(op.index, op.count);
                return;
            case 'move':
                this.moveChildren(op.from, op.to, op.count);
                return;
            case 'set':
                this.setChild(op.index, op.item);
                return;
            case 'reset':
                this.setChildren(op.items);
                return;
        }
    }

    private replaceChildren(): void {
        const element = this.getElement();

        if (!element) {
            return;
        }

        if (this.children.length === 0 && !this.hasChildrenSource()) {
            return;
        }

        if (this.hasStaticChildrenMounted && this.children.length === 0) {
            return;
        }

        if (this.areChildrenAlreadyAttached(element)) {
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const childNode of this.children) {
            if (childNode.element) {
                fragment.appendChild(childNode.element);
            }
        }

        element.replaceChildren(fragment);
    }

    private insertChildElements(index: number, childNodes: readonly this[]): void {
        const element = this.getElement();

        if (!element) {
            return;
        }

        const referenceNode = element.childNodes[index] ?? null;
        const fragment = document.createDocumentFragment();

        for (const childNode of childNodes) {
            if (childNode.element) {
                fragment.appendChild(childNode.element);
            }
        }

        element.insertBefore(fragment, referenceNode);
    }

    private getElement(): Element | undefined {
        if (!this.element || this.element.nodeType !== Node.ELEMENT_NODE) {
            return undefined;
        }

        return this.element as Element;
    }

    private syncComponentElement(): void {
        if (this.children.length > 1) {
            throw new Error(
                'DOM component nodes must return a single root schema. Wrap multiple children in an element.'
            );
        }

        this.element = this.children[0]?.element;
    }

    private attachHandlers(): void {
        const element = this.getElement();
        if (!element) {
            return;
        }

        const handlers = this.schema.attrs?.handlers;
        if (!handlers) {
            return;
        }

        for (const [name, handler] of Object.entries(handlers)) {
            if (typeof handler === 'function') {
                this.addDomEventListener(element, name, handler as EventListener);
            }
        }
    }

    private bindHandlers(): void {
        const element = this.getElement();
        if (!element) {
            return;
        }

        const bindableHandlers = this.schema.attrs?.bindableHandlers;
        if (!bindableHandlers) {
            return;
        }

        for (const [name, binding] of Object.entries(bindableHandlers)) {
            if (!binding || typeof binding !== 'object' || !('subscribe' in binding)) {
                continue;
            }

            const bindable = binding as TExoBindable<(event: Event) => void, unknown>;
            const handler = bindable.getValue();
            if (handler) {
                this.addDomEventListener(element, name, handler);
            }
            
            // Update handler when bindable changes
            this.addDisposer(bindable.subscribe(() => {
                // Remove old handler and add new one
                const newHandler = bindable.getValue();
                if (newHandler) {
                    this.addDomEventListener(element, name, newHandler);
                }
            }));
        }
    }

    private applyConstantAttributes(): void {
        const element = this.getElement();
        if (!element) {
            return;
        }

        this.applyConstantAttributesToElement(element, this.schema);
    }

    private applyConstantAttributesToElement(
        element: Element,
        schema: TExoNodeDomSchema
    ): void {
        const constants = schema.attrs?.static;
        if (!constants) {
            return;
        }

        // Use for..in for better performance than Object.entries
        for (const name in constants) {
            const value = constants[name];
            if (this.shouldSkipDomAttribute(name)) {
                continue;
            }

            // Events should be in handlers prop, not static
            if (this.isEventName(name)) {
                console.warn(`Event handler ${name} in static props. Use handlers.${name} instead.`);
                continue;
            }

            this.applyDomValue(element, name, value);
        }
    }

    private bindEvent(
        element: Element,
        name: string,
        binding: TExoBindable<unknown, unknown>
    ): void {
        let currentHandler: EventListener | undefined;
        const update = () => {
            if (currentHandler) {
                element.removeEventListener(
                    this.getEventName(name),
                    currentHandler
                );
                currentHandler = undefined;
            }

            const nextHandler = binding.getValue();
            if (typeof nextHandler !== 'function') {
                return;
            }

            currentHandler = nextHandler as EventListener;
            element.addEventListener(this.getEventName(name), currentHandler);
        };

        update();
        this.addDisposer(binding.subscribe(update));
        this.addDisposer(() => {
            if (currentHandler) {
                element.removeEventListener(
                    this.getEventName(name),
                    currentHandler
                );
            }
        });
    }

    private addDomEventListener(
        element: Element,
        name: string,
        handler: EventListener
    ): void {
        const eventName = this.getEventName(name);
        element.addEventListener(eventName, handler);
        this.addDisposer(() => {
            element.removeEventListener(eventName, handler);
        });
    }

    private applyDomValue(element: Element, name: string, value: unknown): void {
        if (ExoNodeDom.classAttributes.has(name)) {
            // Direct property access is fastest
            (element as HTMLElement).className = String(value ?? '');
            return;
        }

        if (name === 'style') {
            this.applyStyle(element as HTMLElement, value);
            return;
        }

        if (ExoNodeDom.directPropertyAttributes.has(name)) {
            const record = element as unknown as Record<string, unknown>;
            if (record[name] !== value) {
                record[name] = value;
            }
        }

        if (value === false || value === null || value === undefined) {
            element.removeAttribute(name);
            return;
        }
        
        if (value === true) {
            // Boolean attributes - just set empty string
            element.setAttribute(name, '');
            return;
        }
        
        // For other values, set directly
        element.setAttribute(name, String(value));
    }

    private applyStyle(element: HTMLElement, value: unknown): void {
        if (typeof value === 'string') {
            // Direct style property is faster than getAttribute
            element.style.cssText = value;
            return;
        }

        if (!value || typeof value !== 'object') {
            // Clear style faster
            element.style.cssText = '';
            return;
        }

        // For object styles, batch update
        const styles = value as Record<string, unknown>;
        for (const name in styles) {
            element.style.setProperty(name, String(styles[name]));
        }
    }

    // Set for O(1) lookup instead of multiple comparisons
    private static skipAttributes = new Set(['children', 'textContent', 'onExoMount', 'onExoUnmount']);
    private static directPropertyAttributes = new Set(['value', 'checked']);
    private static classAttributes = new Set(['className', 'class']);
    
    private shouldSkipDomAttribute(name: string): boolean {
        return ExoNodeDom.skipAttributes.has(name);
    }

    // Cache for event name checks
    private static eventNameCheckCache = new Map<string, boolean>();
    
    private isEventName(name: string): boolean {
        const cached = ExoNodeDom.eventNameCheckCache.get(name);
        if (cached !== undefined) {
            return cached;
        }
        
        // Check once and cache
        const isEvent = name.length > 2 && 
                       name[0] === 'o' && 
                       name[1] === 'n' && 
                       name[2] >= 'A' && 
                       name[2] <= 'Z' &&
                       !name.startsWith('onExo');
        
        ExoNodeDom.eventNameCheckCache.set(name, isEvent);
        return isEvent;
    }

    // Static cache shared across all instances
    private static eventNameCache = new Map<string, string>();
    
    private getEventName(name: string): string {
        // Use static cache to avoid per-instance memory
        let cached = ExoNodeDom.eventNameCache.get(name);
        if (!cached) {
            cached = name.slice(2).toLowerCase();
            ExoNodeDom.eventNameCache.set(name, cached);
        }
        return cached;
    }

    private runMountLifecycle(): void {
        if (this.isMounted) {
            return;
        }

        this.isMounted = true;
        this.schema.attrs?.static?.onExoMount?.(this);
    }

    private hasChildrenSource(): boolean {
        return (
            this.schema.attrs?.static?.children !== undefined ||
            this.schema.attrs?.bindables?.children !== undefined ||
            this.schema.attrs?.bindableLists?.children !== undefined
        );
    }

    private areChildrenAlreadyAttached(element: Element): boolean {
        const children = this.children;
        const childNodes = element.childNodes;
        const len = children.length;
        
        if (childNodes.length !== len) {
            return false;
        }
        
        // Unroll small loops for better performance
        if (len <= 3) {
            if (len >= 1 && childNodes[0] !== children[0]?.element) return false;
            if (len >= 2 && childNodes[1] !== children[1]?.element) return false;
            if (len >= 3 && childNodes[2] !== children[2]?.element) return false;
            return true;
        }

        // Regular loop for larger arrays
        for (let i = 0; i < len; i++) {
            if (childNodes[i] !== children[i]?.element) {
                return false;
            }
        }

        return true;
    }

    private createElement(): Element | Text | Comment {
        if (this.schema.type === '#text') {
            return document.createTextNode(
                String(this.schema.attrs?.static?.textContent ?? '')
            );
        }

        const elementType = this.schema.type;
        if (typeof elementType !== 'string') {
            throw new Error('Component nodes do not create DOM elements directly.');
        }

        const element = document.createElement(elementType);
        const textContent = this.schema.attrs?.static?.textContent;

        if (textContent !== undefined) {
            element.textContent = String(textContent);
        }

        return element;
    }

    private mountStaticChildren(): void {
        const element = this.getElement();
        if (
            !element ||
            this.hydratedNode ||
            !this.canRenderStaticSubtree(this.schema)
        ) {
            return;
        }

        // For mixed children, only mount the static portion
        const children = this.getConstantChildren(this.schema);
        if (children.length === 0) {
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const child of children) {
            fragment.appendChild(this.createStaticDomSubtree(child));
        }

        element.appendChild(fragment);
        this.hasStaticChildrenMounted = true;
    }

    private createStaticDomSubtree(schema: TExoNodeDomSchema): Node {
        const root = this.createStaticDomNode(schema);
        const stack: Array<{ schema: TExoNodeDomSchema; node: Node }> = [
            { schema, node: root },
        ];

        while (stack.length > 0) {
            const current = stack.pop();
            if (!current || current.node.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }

            if (current.schema.attrs?.static?.textContent !== undefined) {
                continue;
            }

            const children = this.getConstantChildren(current.schema);
            if (children.length === 0) {
                continue;
            }

            const fragment = document.createDocumentFragment();
            const childEntries: Array<{ schema: TExoNodeDomSchema; node: Node }> = [];

            for (const child of children) {
                const childNode = this.createStaticDomNode(child);
                fragment.appendChild(childNode);
                childEntries.push({ schema: child, node: childNode });
            }

            current.node.appendChild(fragment);

            for (let i = childEntries.length - 1; i >= 0; i--) {
                stack.push(childEntries[i]);
            }
        }

        return root;
    }

    private createStaticDomNode(schema: TExoNodeDomSchema): Node {
        if (schema.type === '#text') {
            return document.createTextNode(
                String(schema.attrs?.static?.textContent ?? '')
            );
        }

        if (typeof schema.type !== 'string') {
            throw new Error(
                'Component nodes cannot be rendered by the static DOM fast path.'
            );
        }

        const element = document.createElement(schema.type);
        const textContent = schema.attrs?.static?.textContent;

        this.applyConstantAttributesToElement(element, schema);

        if (textContent !== undefined) {
            element.textContent = String(textContent);
        }

        return element;
    }

    private canRenderStaticSubtree(schema: TExoNodeDomSchema): boolean {
        // Fragments can't use static fast path
        if (schema.type === '#fragment') {
            return false;
        }
        
        // Can't use fast path if there are reactive attributes or handlers
        if (schema.attrs?.bindables || schema.attrs?.bindableLists || 
            schema.attrs?.handlers || schema.attrs?.bindableHandlers) {
            return false;
        }
        
        const stack = [schema];

        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) {
                continue;
            }
            
            // Fragment nodes break static rendering
            if (current.type === '#fragment') {
                return false;
            }

            if (typeof current.type !== 'string') {
                return false;
            }

            if (current.attrs.bindables || current.attrs.bindableLists ||
                current.attrs.handlers || current.attrs.bindableHandlers) {
                return false;
            }

            if (this.hasRuntimeConstants(current)) {
                return false;
            }

            const children = this.getConstantChildren(current);
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push(children[i]);
            }
        }

        return true;
    }

    private isComponentNode(): boolean {
        return typeof this.schema.type !== 'string';
    }

    private hasRuntimeConstants(schema: TExoNodeDomSchema): boolean {
        const constants = schema.attrs?.static;
        if (!constants) {
            return false;
        }

        // Fast path: check lifecycle methods first
        if (typeof constants.onExoMount === 'function' ||
            typeof constants.onExoUnmount === 'function') {
            return true;
        }
        
        // Use for..in instead of Object.entries for performance
        for (const name in constants) {
            if (this.isEventName(name) && typeof constants[name] === 'function') {
                return true;
            }
        }
        return false;
    }

    private getConstantChildren(
        schema: TExoNodeDomSchema
    ): readonly TExoNodeDomSchema[] {
        const children = schema.attrs?.static?.children;

        if (children === undefined) {
            return [];
        }

        return Array.isArray(children)
            ? (children as readonly TExoNodeDomSchema[])
            : [children as TExoNodeDomSchema];
    }

    private takeHydrationChild(): Element | Text | Comment | undefined {
        if (!this.hydratedNode || this.hydratedNode.nodeType !== Node.ELEMENT_NODE) {
            return undefined;
        }

        this.hydratedChildNodes ??= Array.from(this.hydratedNode.childNodes).filter(
            (childNode): childNode is Element | Text =>
                childNode.nodeType === Node.ELEMENT_NODE ||
                childNode.nodeType === Node.TEXT_NODE
        );

        const childNode = this.hydratedChildNodes[this.hydrationChildIndex++];

        return childNode;
    }
}
