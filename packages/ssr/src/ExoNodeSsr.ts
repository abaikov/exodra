import { ExoNode, type TExoContext, type TExoSchema } from '@exodra/core';
import { ExoNodeString } from '@exodra/string';
import { ssrContextKey } from './context';
import type {
    TExoSsrContext,
    TExoSsrDocumentOptions,
    TExoSsrHeader,
    TExoSsrNodeOptions,
    TExoSsrState,
    TExoSsrStateScriptOptions,
} from './types';

type TExoNodeStringSchema = ConstructorParameters<typeof ExoNodeString>[0];

export class ExoNodeSsr extends ExoNodeString implements TExoSsrContext {
    private readonly ssrState: TExoSsrState;

    constructor(
        schema: TExoSchema,
        options?: TExoSsrNodeOptions,
        autoInit?: boolean
    );
    constructor(
        schema: TExoSchema,
        parentNode?: ExoNode<TExoNodeStringSchema>,
        autoInit?: boolean
    );
    constructor(
        schema: TExoSchema,
        parentOrOptions?: ExoNode<TExoNodeStringSchema> | TExoSsrNodeOptions,
        autoInit = true
    ) {
        const parentNode =
            parentOrOptions instanceof ExoNode
                ? parentOrOptions
                : undefined;
        const options = parentNode
            ? undefined
            : (parentOrOptions as TExoSsrNodeOptions | undefined);

        super(schema as TExoNodeStringSchema, parentNode, false);
        this.ssrState =
            parentNode instanceof ExoNodeSsr
                ? parentNode.ssrState
                : createSsrState(options);

        if (autoInit) {
            this.initSubtreeIterative();
        }
    }

    setStatus(status: number): void {
        this.ssrState.status = status;
    }

    getStatus(): number {
        return this.ssrState.status;
    }

    setHeader(name: string, value: string): void {
        const normalizedName = normalizeHeaderName(name);
        this.ssrState.headers = this.ssrState.headers.filter(
            header => normalizeHeaderName(header.name) !== normalizedName
        );
        this.ssrState.headers.push({ name, value });
    }

    appendHeader(name: string, value: string): void {
        this.ssrState.headers.push({ name, value });
    }

    getHeader(name: string): string | undefined {
        const values = this.getHeaderValues(name);
        return values.length > 0 ? values.join(', ') : undefined;
    }

    getHeaderValues(name: string): readonly string[] {
        const normalizedName = normalizeHeaderName(name);
        return this.ssrState.headers
            .filter(header => normalizeHeaderName(header.name) === normalizedName)
            .map(header => header.value);
    }

    getHeaders(): readonly TExoSsrHeader[] {
        return this.ssrState.headers.map(header => ({ ...header }));
    }

    addHead(schema: TExoSchema | readonly TExoSchema[]): void {
        this.ssrState.head.push(...normalizeSchemas(schema));
    }

    renderHead(): string {
        return renderSchemas(this.ssrState.head);
    }

    setState(key: string, value: unknown): void {
        this.ssrState.state.set(key, value);
    }

    getState<TValue = unknown>(key: string): TValue | undefined {
        return this.ssrState.state.get(key) as TValue | undefined;
    }

    getStateSnapshot(): Record<string, unknown> {
        return Object.fromEntries(this.ssrState.state);
    }

    renderStateScript(options: TExoSsrStateScriptOptions = {}): string {
        if (this.ssrState.state.size === 0) {
            return '';
        }

        const id = options.id ?? '__EXODRA_STATE__';
        const attributes = renderAttributes({
            id,
            type: 'application/json',
            nonce: options.nonce,
        });
        const json = escapeScriptJson(JSON.stringify(this.getStateSnapshot()));

        return `<script${attributes}>${json}</script>`;
    }

    renderBody(): string {
        return this.html;
    }

    renderDocument(options: TExoSsrDocumentOptions = {}): string {
        const doctype = options.doctype === false
            ? ''
            : `${options.doctype ?? '<!doctype html>'}\n`;
        const htmlAttributes = renderAttributes({
            lang: options.lang ?? 'en',
            ...(options.htmlAttributes ?? {}),
        });
        const bodyAttributes = renderAttributes(options.bodyAttributes ?? {});
        const rootId = options.rootId ?? 'app';
        const headHtml = `${renderSchemas(options.head)}${this.renderHead()}`;
        const stateScript = this.renderStateScript({ nonce: options.nonce });

        return `${doctype}<html${htmlAttributes}><head>${headHtml}</head><body${bodyAttributes}><div id="${escapeAttribute(rootId)}">${this.renderBody()}</div>${stateScript}</body></html>`;
    }

    protected override createContext(): TExoContext<TExoNodeStringSchema> {
        const context = super.createContext();
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

function createSsrState(options: TExoSsrNodeOptions = {}): TExoSsrState {
    return {
        status: options.status ?? 200,
        headers: [...(options.headers ?? [])],
        head: normalizeSchemas(options.head),
        state: options.state instanceof Map
            ? new Map(options.state)
            : new Map(Object.entries(options.state ?? {})),
    };
}

function normalizeSchemas(
    schema: TExoSchema | readonly TExoSchema[] | undefined
): TExoSchema[] {
    if (schema === undefined) {
        return [];
    }

    return Array.isArray(schema)
        ? [...(schema as readonly TExoSchema[])]
        : [schema as TExoSchema];
}

function renderSchemas(schema: TExoSchema | readonly TExoSchema[] | undefined): string {
    return normalizeSchemas(schema)
        .map(item => new ExoNodeString(item as TExoNodeStringSchema).html)
        .join('');
}

function normalizeHeaderName(name: string): string {
    return name.toLowerCase();
}

function renderAttributes(attributes: Record<string, unknown>): string {
    const entries: string[] = [];

    for (const [name, value] of Object.entries(attributes)) {
        if (
            value === false ||
            value === null ||
            value === undefined ||
            typeof value === 'function'
        ) {
            continue;
        }

        if (value === true) {
            entries.push(name);
            continue;
        }

        entries.push(`${name}="${escapeAttribute(String(value))}"`);
    }

    return entries.length > 0 ? ` ${entries.join(' ')}` : '';
}

function escapeScriptJson(json: string): string {
    return json
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
