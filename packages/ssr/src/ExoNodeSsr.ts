import type { TExoContext, TExoSchema } from '@exodra/core';
import { ExoNodeString, type TExoRenderScope } from '@exodra/string';
import { ssrContextKey } from './context';
import { ExoSsrContextBase } from './ExoSsrContextBase';
import { normalizeSchemas } from './normalizeSchemas';
import { renderSchemas } from './renderSchemas';
import type {
    TExoSsrContext,
    TExoSsrDocumentOptions,
    TExoSsrHeader,
    TExoSsrNodeOptions,
    TExoSsrStateScriptOptions,
} from './types';

type TExoNodeStringSchema = ConstructorParameters<typeof ExoNodeString>[0];

// The walker's SSR context: <head> is collected as SCHEMAS and rendered with the
// snapshot walker on demand (compile mode collects pre-rendered HTML instead).
// The body is read back lazily because the node renders AFTER this exists.
class ExoSsrWalkerContext extends ExoSsrContextBase {
    private readonly head: TExoSchema[];

    constructor(
        options: TExoSsrNodeOptions,
        private readonly body: () => string
    ) {
        super(options);
        this.head = normalizeSchemas(options.head);
    }

    addHead(schema: TExoSchema | readonly TExoSchema[]): void {
        const items = normalizeSchemas(schema);
        for (let i = 0; i < items.length; i++) {
            this.head.push(items[i]);
        }
    }

    renderHead(): string {
        return renderSchemas(this.head);
    }

    renderBody(): string {
        return this.body();
    }
}

/**
 * The snapshot walker with a per-request SSR context attached: components reach
 * status / headers / head / state through inject(ssrContextKey).
 *
 * It already extends ExoNodeString, so it cannot also extend
 * ExoSsrContextBase — it owns one and forwards the context API to it. That
 * keeps ONE implementation of the response state shared with compile mode.
 */
export class ExoNodeSsr extends ExoNodeString implements TExoSsrContext {
    private readonly ssr: ExoSsrWalkerContext;

    constructor(schema: TExoSchema, options?: TExoSsrNodeOptions) {
        // Defer rendering until the SSR context exists — components inject() it
        // during the render pass, so it must be in place first.
        super(schema as TExoNodeStringSchema, false);
        this.ssr = new ExoSsrWalkerContext(options ?? {}, () => this.html);
        this.html = this.render(this.schema);
    }

    setStatus(status: number): void {
        this.ssr.setStatus(status);
    }

    getStatus(): number {
        return this.ssr.getStatus();
    }

    setHeader(name: string, value: string): void {
        this.ssr.setHeader(name, value);
    }

    appendHeader(name: string, value: string): void {
        this.ssr.appendHeader(name, value);
    }

    getHeader(name: string): string | undefined {
        return this.ssr.getHeader(name);
    }

    getHeaderValues(name: string): readonly string[] {
        return this.ssr.getHeaderValues(name);
    }

    getHeaders(): readonly TExoSsrHeader[] {
        return this.ssr.getHeaders();
    }

    addHead(schema: TExoSchema | readonly TExoSchema[]): void {
        this.ssr.addHead(schema);
    }

    renderHead(): string {
        return this.ssr.renderHead();
    }

    setState(key: string, value: unknown): void {
        this.ssr.setState(key, value);
    }

    getState<TValue = unknown>(key: string): TValue | undefined {
        return this.ssr.getState<TValue>(key);
    }

    getStateSnapshot(): Record<string, unknown> {
        return this.ssr.getStateSnapshot();
    }

    renderStateScript(options?: TExoSsrStateScriptOptions): string {
        return this.ssr.renderStateScript(options);
    }

    renderBody(): string {
        return this.html;
    }

    renderDocument(options?: TExoSsrDocumentOptions): string {
        return this.ssr.renderDocument(options);
    }

    protected override createContext(
        schema: TExoNodeStringSchema,
        scope: TExoRenderScope
    ): TExoContext<TExoNodeStringSchema> {
        const context = super.createContext(schema, scope);
        const inject = context.inject;

        return {
            ...context,
            inject: (key, fallback) => {
                if (key.id === ssrContextKey.id) {
                    return this as TExoSsrContext as never;
                }
                return inject(key, fallback);
            },
        };
    }
}
