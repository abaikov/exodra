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
import { ExoSsrContextBase } from './ExoSsrContextBase';
import type { TExoSsrDocumentOptions, TExoSsrHeader } from './types';

// Status/headers/state/document assembly all live in the shared base; compile
// mode only differs in <head> storage and where the body comes from.
class CompiledSsrContext extends ExoSsrContextBase {
    private readonly headHtml: string[] = [];
    private body = '';

    // Compiled children arrive as SafeHtml (already-rendered HTML), not schemas.
    addHead(value: unknown): void {
        const items = Array.isArray(value) ? value : [value];
        for (const item of items) this.headHtml.push(String(item));
    }

    renderHead(): string {
        return this.headHtml.join('');
    }

    setBody(html: string): void {
        this.body = html;
    }

    renderBody(): string {
        return this.body;
    }
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

// Run a compiled SSR page (a `() => SafeHtml` closure) with a fresh request SSR
// context, returning the HTML plus everything the metadata components collected.
export function renderToStringCompiled(
    render: () => unknown
): TExoCompiledSsrResult {
    const ctx = new CompiledSsrContext();
    const values = new Map<symbol, unknown>([[ssrContextKey.id, ctx]]);
    const html = String(runWithAmbient(values, render));
    ctx.setBody(html);
    return {
        html,
        status: ctx.getStatus(),
        headers: ctx.getHeaders(),
        head: ctx.renderHead(),
        stateScript: ctx.renderStateScript(),
        state: ctx.getStateSnapshot(),
        renderDocument: (options?: TExoSsrDocumentOptions) =>
            ctx.renderDocument(options),
    };
}
