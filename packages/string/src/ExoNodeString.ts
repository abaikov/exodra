import type {
    TExoContext,
    TExoContextKey,
    TExoNodeSchema,
    TExoSchema,
} from '@exodra/core';
import type { TExoBindable, TExoBindableList } from '@exodra/reactivity-types';
import { escapeHtml, serializeAttribute } from './escape';

type TExoNodeStringSchema = TExoNodeSchema<TExoSchema['type'], TStringAttributes>;

// HTML void elements have no closing tag and no children. Emitting `<br></br>`
// is invalid HTML and the parser reinterprets `</br>` as a second `<br>`, so a
// void-element table is mandatory for correct SSR output.
const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

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
        children?: TExoBindableList<TExoNodeStringSchema, unknown>;
    };
    // Event handlers are ignored when serializing.
    handlers?: Record<string, unknown>;
    bindableHandlers?: Record<string, unknown>;
};

// Component provide()/inject() scope, threaded parent->child during the render walk.
export interface TExoRenderScope {
    values?: Map<symbol, unknown>;
    parent?: TExoRenderScope;
}

/**
 * Standalone SNAPSHOT renderer — serializes a schema to an HTML string in ONE pass,
 * reading each bindable's current value once. No live tree, no subscriptions, no
 * reconcile: SSR/render-to-string is one-shot. It does NOT share a base class with
 * the DOM (live) renderer; both only share the renderer-agnostic core primitives.
 *
 * A single instance renders the whole subtree recursively. `render`/`renderNode`/
 * `createContext` are `protected` so specialisations (e.g. SSR, a debugger) can
 * extend the class and hook the component context.
 */
export class ExoNodeString {
    public readonly schema: TExoNodeStringSchema;
    public html!: string;

    constructor(schema: TExoNodeStringSchema, autoRender = true) {
        this.schema = schema;
        if (autoRender) {
            this.html = this.render(schema);
        }
    }

    /** Render a schema to its HTML string (root scope). */
    protected render(schema: TExoNodeStringSchema): string {
        return this.renderNode(schema, {});
    }

    // Render one node: resolve component chains (rendering their output with no
    // wrapper), else serialize the element/text/fragment and recurse into children.
    protected renderNode(schema: TExoNodeStringSchema, scope: TExoRenderScope): string {
        const type = schema.type;
        if (typeof type === 'function') {
            // A component renders as the HTML of its output, no wrapper. Its context
            // gets a fresh child scope so its provide() reaches its descendants.
            const childScope: TExoRenderScope = { parent: scope };
            const output = this.normalizeChildren(
                (type as (ctx: TExoContext<TExoNodeStringSchema>) => unknown)(
                    this.createContext(schema, childScope)
                ) as TExoNodeStringSchema | readonly TExoNodeStringSchema[]
            );
            let out = '';
            for (let i = 0; i < output.length; i++) {
                out += this.renderNode(output[i], childScope);
            }
            return out;
        }

        const children = this.resolveChildren(schema);
        let childrenHtml = '';
        for (let i = 0; i < children.length; i++) {
            childrenHtml += this.renderNode(children[i], scope);
        }
        return this.renderElement(schema, childrenHtml);
    }

    // The component context — overridable so specialisations can hook inject/provide.
    protected createContext(
        schema: TExoNodeStringSchema,
        scope: TExoRenderScope
    ): TExoContext<TExoNodeStringSchema> {
        return {
            schema,
            createNode: <TNodeSchema extends TExoNodeSchema>(s: TNodeSchema): TNodeSchema => s,
            getConstant: <TValue = unknown>(name: string): TValue | undefined =>
                schema.attrs?.static?.[name] as TValue | undefined,
            getBindable: <TValue = unknown>(name: string): TValue | undefined =>
                (schema.attrs?.bindables as Record<string, unknown> | undefined)?.[name] as
                    | TValue
                    | undefined,
            getBindableList: <TValue = unknown>(name: string): TValue | undefined =>
                (schema.attrs?.bindableLists as Record<string, unknown> | undefined)?.[name] as
                    | TValue
                    | undefined,
            provide: <T>(key: TExoContextKey<T>, value: T) => {
                (scope.values ??= new Map()).set(key.id, value);
            },
            inject: <T>(key: TExoContextKey<T>, fallback?: T) => {
                for (let s: TExoRenderScope | undefined = scope; s; s = s.parent) {
                    if (s.values?.has(key.id)) return s.values.get(key.id) as T;
                }
                return fallback as T;
            },
            // One-shot render: nothing to dispose.
            onDispose: () => {},
        };
    }

    // Effective children for a schema (bindableLists > bindables > static), with
    // primitive children turned into #text schemas.
    protected resolveChildren(
        schema: TExoNodeStringSchema
    ): readonly TExoNodeStringSchema[] {
        const attrs = schema.attrs;

        const childList = attrs?.bindableLists?.children;
        if (childList) {
            return this.normalizeChildren(childList.snapshot());
        }

        const childBinding = attrs?.bindables?.children;
        if (childBinding) {
            const value = childBinding.getValue();
            return this.normalizeChildren(
                typeof value === 'string'
                    ? this.createTextSchema(value)
                    : (value as TExoNodeStringSchema | readonly TExoNodeStringSchema[])
            );
        }

        const children = attrs?.static?.children;
        if (children === undefined) return [];
        return this.normalizeChildren(children);
    }

    protected normalizeChildren(
        children: TExoNodeStringSchema | readonly TExoNodeStringSchema[]
    ): readonly TExoNodeStringSchema[] {
        const out: TExoNodeStringSchema[] = [];
        const push = (c: unknown): void => {
            if (c == null || typeof c === 'boolean') return;
            if (Array.isArray(c)) {
                for (let i = 0; i < c.length; i++) push(c[i]);
                return;
            }
            const t = typeof c;
            if (t === 'string' || t === 'number' || t === 'bigint') {
                out.push(this.createTextSchema(String(c)));
                return;
            }
            out.push(c as TExoNodeStringSchema);
        };
        push(children);
        return out;
    }

    private createTextSchema(text: string): TExoNodeStringSchema {
        return {
            type: '#text',
            attrs: { static: { textContent: text } },
        } as TExoNodeStringSchema;
    }

    private renderElement(
        schema: TExoNodeStringSchema,
        childrenHtml: string
    ): string {
        const type = schema.type;
        if (typeof type !== 'string') return childrenHtml;

        if (type === '#text') {
            const textContent =
                schema.attrs?.bindables?.textContent?.getValue() ??
                schema.attrs?.static?.textContent ??
                '';
            return this.escapeHtml(textContent);
        }

        // Fragment: children with no wrapper.
        if (type === '#fragment') return childrenHtml;

        const attrs = this.renderAttributes(schema);

        // Void elements: no content, no closing tag.
        if (VOID_ELEMENTS.has(type)) {
            return `<${type}${attrs}>`;
        }

        // Raw inner HTML escape hatch: emit verbatim, skip children/textContent.
        const rawHtml = schema.attrs?.static?.dangerouslySetInnerHTML as
            | { __html?: unknown }
            | undefined;
        if (rawHtml && typeof rawHtml === 'object' && rawHtml.__html != null) {
            return `<${type}${attrs}>${String(rawHtml.__html)}</${type}>`;
        }

        const textContent =
            schema.attrs?.bindables?.textContent?.getValue() ??
            schema.attrs?.static?.textContent;
        // Nullish textContent = no value → fall back to children (a literal
        // `null`/`undefined` must not blank the children or print "null").
        const contentHtml =
            textContent == null ? childrenHtml : this.escapeHtml(textContent);

        return `<${type}${attrs}>${contentHtml}</${type}>`;
    }

    private renderAttributes(schema: TExoNodeStringSchema): string {
        const entries: string[] = [];
        // Normalized attribute name -> index in `entries`, so a repeated
        // attribute (e.g. both `class` and `className`, which both serialize to
        // `class`) does not emit a duplicate attribute — the last write wins.
        const seen = new Map<string, number>();
        const staticAttrs = schema.attrs?.static;
        if (staticAttrs) {
            for (const [name, value] of Object.entries(staticAttrs)) {
                this.pushSerializableAttribute(entries, seen, name, value);
            }
        }
        const bindables = schema.attrs?.bindables;
        if (bindables) {
            for (const [name, bindable] of Object.entries(bindables)) {
                this.pushSerializableAttribute(
                    entries,
                    seen,
                    name,
                    (bindable as TExoBindable<unknown, unknown>).getValue()
                );
            }
        }
        return entries.length > 0 ? ` ${entries.join(' ')}` : '';
    }

    private pushSerializableAttribute(
        entries: string[],
        seen: Map<string, number>,
        name: string,
        value: unknown
    ): void {
        const attr = serializeAttribute(name, value);
        if (!attr) return;
        const key = name === 'className' ? 'class' : name;
        const prev = seen.get(key);
        if (prev !== undefined) {
            entries[prev] = attr; // overwrite the earlier duplicate
            return;
        }
        seen.set(key, entries.length);
        entries.push(attr);
    }

    protected escapeHtml(value: unknown): string {
        return escapeHtml(value);
    }
}
