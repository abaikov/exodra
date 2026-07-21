import { ExoNode, type TExoNodeSchema, type TExoSchema } from '@exodra/core';
import type {
    TExoBindable,
    TExoBindableList,
    TExoListOp,
} from '@exodra/reactivity-types';


type TExoNodeStringSchema = TExoNodeSchema<TExoSchema['type'], TStringAttributes>;

type TStringAttributes = {
    static?: Record<string, unknown> & {
        children?: TExoNodeStringSchema | readonly TExoNodeStringSchema[];
        textContent?: unknown;
    };
    bindables?: Record<string, TExoBindable<unknown, unknown>> & {
        children?: TExoBindable<
            TExoNodeStringSchema | readonly TExoNodeStringSchema[],
            unknown
        >;
        textContent?: TExoBindable<unknown, unknown>;
    };
    bindableLists?: Record<string, TExoBindableList<unknown, unknown>> & {
        children?: TExoBindableList<
            TExoNodeStringSchema,
            TExoListOp<TExoNodeStringSchema>
        >;
    };
    // Event handlers are ignored in SSR
    handlers?: Record<string, unknown>;
    bindableHandlers?: Record<string, unknown>;
};

export class ExoNodeString extends ExoNode<TExoNodeStringSchema> {
    html!: string;
    private childHtmlParts: string[] = [];

    constructor(
        schema: TExoNodeStringSchema,
        parentNode?: ExoNode<TExoNodeStringSchema>,
        autoInit = true
    ) {
        super(schema, parentNode, false);
        if (autoInit) {
            this.initSubtreeIterative();
        }
    }

    protected override onInit(): void {
        this.html = this.renderHtmlFromChildren('');
        this.bindAttributes();
        this.bindTextContent();
        this.bindChildren();
    }

    protected override resolveChildren(): readonly TExoNodeStringSchema[] {
        // For component nodes, let the component function determine children
        if (typeof this.schema.type === 'function') {
            return super.resolveChildren();
        }
        
        // For element nodes, look for children in attrs
        const childList = this.schema.attrs?.bindableLists?.children;
        if (childList) {
            return childList.snapshot();
        }

        const childBinding = this.schema.attrs?.bindables?.children;
        if (childBinding) {
            const value = childBinding.getValue();
            return this.normalizeChildren(typeof value === 'string' ? this.createTextSchema(value) : value);
        }

        const children = this.schema.attrs?.static?.children;

        if (children === undefined) {
            return super.resolveChildren();
        }

        // Convert a single primitive child to a text node.
        const childType = typeof children;
        if (childType === 'string' || childType === 'number' || childType === 'bigint') {
            return [this.createTextSchema(String(children))];
        }

        return this.normalizeChildren(children);
    }

    protected override normalizeChildren(
        children: TExoNodeStringSchema | readonly TExoNodeStringSchema[]
    ): readonly TExoNodeStringSchema[] {
        const normalized = super.normalizeChildren(children);
        // Convert string/number/bigint primitives to text schemas.
        return normalized.map(child => {
            const itemType = typeof child;
            return itemType === 'string' || itemType === 'number' || itemType === 'bigint'
                ? this.createTextSchema(String(child))
                : child;
        }) as readonly TExoNodeStringSchema[];
    }
    
    private createTextSchema(text: string): TExoNodeStringSchema {
        return {
            type: '#text',
            attrs: {
                static: {
                    textContent: text
                }
            }
        } as TExoNodeStringSchema;
    }

    protected override onChildrenReplaced(): void {
        this.childHtmlParts = this.children.map(child => child.html);
        this.updateHtmlFromParts();
    }

    protected override onChildrenInserted(
        index: number,
        childNodes: readonly this[]
    ): void {
        this.childHtmlParts.splice(index, 0, ...childNodes.map(child => child.html));
        this.updateHtmlFromParts();
    }

    protected override onChildrenRemoved(
        index: number,
        childNodes: readonly this[]
    ): void {
        this.childHtmlParts.splice(index, childNodes.length);
        this.updateHtmlFromParts();
    }

    protected override onChildrenMoved(
        from: number,
        to: number,
        count: number
    ): void {
        const movedParts = this.childHtmlParts.splice(from, count);
        this.childHtmlParts.splice(to, 0, ...movedParts);
        this.updateHtmlFromParts();
    }

    protected override onChildSet(index: number, childNode: this): void {
        this.childHtmlParts[index] = childNode.html;
        this.updateHtmlFromParts();
    }

    protected override onChildChanged(childNode: ExoNode<TExoNodeStringSchema>): void {
        const index = this.children.indexOf(childNode as this);
        if (index === -1) {
            return;
        }

        this.childHtmlParts[index] = (childNode as this).html;
        this.updateHtmlFromParts();
    }

    private bindTextContent(): void {
        const textContent = this.schema.attrs?.bindables?.textContent;

        if (!textContent) {
            return;
        }

        const update = () => {
            this.updateHtmlFromParts();
        };

        this.addDisposer(textContent.subscribe(update));
    }

    private bindAttributes(): void {
        const bindables = this.schema.attrs?.bindables;
        if (!bindables) {
            return;
        }

        for (const [name, bindable] of Object.entries(bindables)) {
            if (
                name === 'children' ||
                name === 'textContent' ||
                this.isEventName(name)
            ) {
                continue;
            }

            this.addDisposer(
                (bindable as TExoBindable<unknown, unknown>).subscribe(() => {
                    this.updateHtmlFromParts();
                })
            );
        }
    }

    private bindChildren(): void {
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
                childList.subscribeOps(
                    (op: TExoListOp<TExoNodeStringSchema>) => {
                        this.applyChildrenOp(op);
                    }
                )
            );
        }
    }

    private applyChildrenOp(op: TExoListOp<TExoNodeStringSchema>): void {
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

    private updateHtmlFromParts(): void {
        const nextHtml = this.renderHtmlFromChildren(this.childHtmlParts.join(''));

        if (this.html === nextHtml) {
            return;
        }

        this.html = nextHtml;
        this.notifyChanged();
    }

    private renderHtmlFromChildren(childrenHtml: string): string {
        if (typeof this.schema.type !== 'string') {
            return childrenHtml;
        }

        if (this.schema.type === '#text') {
            const textContent =
                this.schema.attrs?.bindables?.textContent?.getValue() ??
                this.schema.attrs?.static?.textContent ??
                '';

            return this.escapeHtml(textContent);
        }
        
        // Fragment should just render its children without wrapper
        if (this.schema.type === '#fragment') {
            return childrenHtml;
        }

        // Raw inner HTML (React-style escape hatch): emit verbatim, skip children
        // and textContent. Used e.g. to inject a server-rendered island's markup.
        const rawHtml = this.schema.attrs.static?.dangerouslySetInnerHTML as
            | { __html?: unknown }
            | undefined;
        if (rawHtml && typeof rawHtml === 'object' && rawHtml.__html != null) {
            return `<${this.schema.type}${this.renderAttributes()}>${String(rawHtml.__html)}</${this.schema.type}>`;
        }

        const textContent =
            this.schema.attrs.bindables?.textContent?.getValue() ??
            this.schema.attrs.static?.textContent;
        const contentHtml =
            textContent === undefined ? childrenHtml : this.escapeHtml(textContent);

        return `<${this.schema.type}${this.renderAttributes()}>${contentHtml}</${this.schema.type}>`;
    }

    private renderAttributes(): string {
        const entries: string[] = [];

        for (const [name, value] of Object.entries(
            this.schema.attrs?.static ?? {}
        )) {
            this.pushSerializableAttribute(entries, name, value);
        }

        for (const [name, bindable] of Object.entries(
            this.schema.attrs?.bindables ?? {}
        )) {
            this.pushSerializableAttribute(
                entries,
                name,
                (bindable as TExoBindable<unknown, unknown>).getValue()
            );
        }

        return entries.length > 0 ? ` ${entries.join(' ')}` : '';
    }

    private pushSerializableAttribute(
        entries: string[],
        name: string,
        value: unknown
    ): void {
        if (
            name === 'children' ||
            name === 'textContent' ||
            name === 'dangerouslySetInnerHTML' ||
            name === 'onExoMount' ||
            name === 'onExoUnmount' ||
            this.isEventName(name) ||
            typeof value === 'function' ||
            value === false ||
            value === null ||
            value === undefined
        ) {
            return;
        }

        const attributeName = name === 'className' ? 'class' : name;
        if (value === true) {
            entries.push(attributeName);
            return;
        }

        entries.push(
            `${attributeName}="${this.escapeAttribute(this.serializeAttributeValue(value))}"`
        );
    }

    private serializeAttributeValue(value: unknown): string {
        if (!value || typeof value !== 'object') {
            return String(value);
        }

        return Object.entries(value as Record<string, unknown>)
            .map(([name, nextValue]) => `${name}: ${String(nextValue)}`)
            .join('; ');
    }

    private isEventName(name: string): boolean {
        return /^on[A-Z]/.test(name) && !name.startsWith('onExo');
    }

    private escapeHtml(value: unknown): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    private escapeAttribute(value: string): string {
        return this.escapeHtml(value);
    }
}
