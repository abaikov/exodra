// Entry point for SSR compile-mode rendering. A page compiled with the plugin's
// mode:'ssr' is a function returning HTML (SafeHtml). During its (synchronous)
// run, metadata components (Status/Head/Header/State) call inject(ssrContextKey)
// to reach the per-request SSR context. Here we install that context as the
// request-scoped ambient (runWithAmbient), run the page, and hand back the HTML
// plus the collected status/headers/head/state.
//
// Unlike ExoNodeSsr (the walker), addHead receives ALREADY-RENDERED HTML
// (compiled children are SafeHtml strings), so it stores strings, not schemas.

import { runWithAmbient } from '@exodra/string';
import { ssrContextKey } from './context';
import type {
    TExoSsrDocumentOptions,
    TExoSsrHeader,
    TExoSsrStateScriptOptions,
} from './types';

class CompiledSsrContext {
    status = 200;
    readonly headers: TExoSsrHeader[] = [];
    readonly headHtml: string[] = [];
    readonly state = new Map<string, unknown>();

    setStatus(status: number): void {
        this.status = status;
    }
    getStatus(): number {
        return this.status;
    }

    setHeader(name: string, value: string): void {
        const normalized = name.toLowerCase();
        for (let i = this.headers.length - 1; i >= 0; i--) {
            if (this.headers[i].name.toLowerCase() === normalized) {
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
        const normalized = name.toLowerCase();
        return this.headers
            .filter(h => h.name.toLowerCase() === normalized)
            .map(h => h.value);
    }
    getHeaders(): readonly TExoSsrHeader[] {
        return this.headers.map(h => ({ ...h }));
    }

    // Compiled children arrive as SafeHtml (already-rendered HTML), not schemas.
    addHead(value: unknown): void {
        const items = Array.isArray(value) ? value : [value];
        for (const item of items) this.headHtml.push(String(item));
    }
    renderHead(): string {
        return this.headHtml.join('');
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
        if (this.state.size === 0) return '';
        // id/nonce are developer config, but escape them anyway so a stray quote
        // can't break out of the attribute (mirrors the walker's renderAttributes).
        const id = escapeAttr(options.id ?? '__EXODRA_STATE__');
        const nonce = options.nonce
            ? ` nonce="${escapeAttr(options.nonce)}"`
            : '';
        const json = escapeScriptJson(JSON.stringify(this.getStateSnapshot()));
        return `<script id="${id}" type="application/json"${nonce}>${json}</script>`;
    }
}

function escapeScriptJson(json: string): string {
    return json
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

export interface TExoCompiledSsrResult {
    /** The rendered body HTML. */
    html: string;
    /** HTTP status set via <Status> (default 200). */
    status: number;
    /** Response headers set via <Header>. */
    headers: readonly TExoSsrHeader[];
    /** Concatenated <head> HTML collected via <Head>. */
    head: string;
    /** A `<script type="application/json">` with the <State>, or `''`. */
    stateScript: string;
    /** Raw collected state. */
    state: Record<string, unknown>;
    /** Assemble a full HTML document from the body + collected head/state. */
    renderDocument(options?: TExoSsrDocumentOptions): string;
}

function escapeAttr(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderDocument(
    body: string,
    ctx: CompiledSsrContext,
    options: TExoSsrDocumentOptions = {}
): string {
    const doctype =
        options.doctype === false ? '' : `${options.doctype ?? '<!doctype html>'}\n`;
    const lang = options.lang ?? 'en';
    const rootId = options.rootId ?? 'app';
    const head = ctx.renderHead();
    const stateScript = ctx.renderStateScript({ nonce: options.nonce });
    return `${doctype}<html lang="${escapeAttr(lang)}"><head>${head}</head><body><div id="${escapeAttr(rootId)}">${body}</div>${stateScript}</body></html>`;
}

// Run a compiled SSR page (a `() => SafeHtml` closure) with a fresh request SSR
// context, returning the HTML plus everything the metadata components collected.
export function renderToStringCompiled(
    render: () => unknown
): TExoCompiledSsrResult {
    const ctx = new CompiledSsrContext();
    const values = new Map<symbol, unknown>([[ssrContextKey.id, ctx]]);
    const html = String(runWithAmbient(values, render));
    return {
        html,
        status: ctx.getStatus(),
        headers: ctx.getHeaders(),
        head: ctx.renderHead(),
        stateScript: ctx.renderStateScript(),
        state: ctx.getStateSnapshot(),
        renderDocument: (options?: TExoSsrDocumentOptions) =>
            renderDocument(html, ctx, options),
    };
}
