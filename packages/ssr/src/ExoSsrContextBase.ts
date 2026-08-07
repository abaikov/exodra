import type { TExoSchema } from '@exodra/core';
import { escapeAttribute, spaceAttribute } from '@exodra/string';
import { renderJsonScript } from './renderJsonScript';
import { renderSchemas } from './renderSchemas';
import type {
    TExoSsrDocumentOptions,
    TExoSsrHeader,
    TExoSsrNodeOptions,
    TExoSsrStateScriptOptions,
} from './types';

/**
 * The per-request SSR response state — status, headers, state, and document
 * assembly — shared by BOTH render modes: the schema walker (ExoNodeSsr) and the
 * compiled renderer (renderToStringCompiled). Everything that is mode-specific
 * is abstract: how `<head>` entries are stored/rendered (schemas vs
 * already-rendered HTML) and where the body HTML comes from.
 *
 * These are once-per-REQUEST operations, never per-node, so they are written for
 * clarity, not for the render hot path.
 */
export abstract class ExoSsrContextBase {
    private status: number;
    private readonly headers: TExoSsrHeader[];
    private readonly state: Map<string, unknown>;

    constructor(options: TExoSsrNodeOptions = {}) {
        this.status = options.status ?? 200;
        this.headers = [...(options.headers ?? [])];
        this.state =
            options.state instanceof Map
                ? new Map(options.state)
                : new Map(Object.entries(options.state ?? {}));
    }

    setStatus(status: number): void {
        this.status = status;
    }

    getStatus(): number {
        return this.status;
    }

    /** Replace every header with this name (case-insensitive), then append it. */
    setHeader(name: string, value: string): void {
        const normalizedName = normalizeHeaderName(name);
        for (let i = this.headers.length - 1; i >= 0; i--) {
            if (normalizeHeaderName(this.headers[i].name) === normalizedName) {
                this.headers.splice(i, 1);
            }
        }
        this.headers.push({ name, value });
    }

    appendHeader(name: string, value: string): void {
        this.headers.push({ name, value });
    }

    getHeader(name: string): string | undefined {
        const values = this.getHeaderValues(name);
        return values.length > 0 ? values.join(', ') : undefined;
    }

    getHeaderValues(name: string): readonly string[] {
        const normalizedName = normalizeHeaderName(name);
        const values: string[] = [];
        for (let i = 0; i < this.headers.length; i++) {
            if (normalizeHeaderName(this.headers[i].name) === normalizedName) {
                values.push(this.headers[i].value);
            }
        }
        return values;
    }

    /** Copies — mutating the result must not reach the request state. */
    getHeaders(): readonly TExoSsrHeader[] {
        return this.headers.map(header => ({ ...header }));
    }

    setState(key: string, value: unknown): void {
        this.state.set(key, value);
    }

    getState<TValue = unknown>(key: string): TValue | undefined {
        return this.state.get(key) as TValue | undefined;
    }

    getStateSnapshot(): Record<string, unknown> {
        return Object.fromEntries(this.state);
    }

    renderStateScript(options: TExoSsrStateScriptOptions = {}): string {
        if (this.state.size === 0) {
            return '';
        }

        return renderJsonScript(JSON.stringify(this.getStateSnapshot()), {
            id: options.id ?? '__EXODRA_STATE__',
            nonce: options.nonce,
        });
    }

    /** Assemble the full HTML document around the rendered body. */
    renderDocument(options: TExoSsrDocumentOptions = {}): string {
        const doctype =
            options.doctype === false
                ? ''
                : `${options.doctype ?? '<!doctype html>'}\n`;
        const htmlAttributes = renderAttributes({
            lang: options.lang ?? 'en',
            ...(options.htmlAttributes ?? {}),
        });
        const bodyAttributes = renderAttributes(options.bodyAttributes ?? {});
        const rootId = options.rootId ?? 'app';
        // `options.head` is rendered BEFORE the head collected during the render.
        const headHtml = `${renderSchemas(options.head)}${this.renderHead()}`;
        const stateScript = this.renderStateScript({ nonce: options.nonce });

        return `${doctype}<html${htmlAttributes}><head>${headHtml}</head><body${bodyAttributes}><div id="${escapeAttribute(rootId)}">${this.renderBody()}</div>${stateScript}</body></html>`;
    }

    /**
     * Collect a `<head>` entry. The declared type is the schema form (what
     * `TExoSsrContext` promises); compile mode receives already-rendered
     * `SafeHtml` through the same call and narrows at its own boundary.
     */
    abstract addHead(schema: TExoSchema | readonly TExoSchema[]): void;

    /** The collected `<head>` as HTML. */
    abstract renderHead(): string;

    /** The rendered body HTML. */
    abstract renderBody(): string;
}

function normalizeHeaderName(name: string): string {
    return name.toLowerCase();
}

// Attribute serialization goes through @exodra/string's `spaceAttribute`, the
// same helper the element renderers use, so `<html>`/`<body>`/`<script>`
// attributes follow identical rules (className→class, folded object values,
// bare `true`, dropped false/nullish/function/event props).
function renderAttributes(attributes: Record<string, unknown>): string {
    let out = '';
    for (const name in attributes) {
        out += spaceAttribute(name, attributes[name]);
    }
    return out;
}
