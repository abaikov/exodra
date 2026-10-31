import { assertExoLegalAttrName, escapeExoAttributeValue } from '@exodra/core';
import { EXO_STATE_SCRIPT_ID } from '../constants/EXO_STATE_SCRIPT_ID';
import { renderExoJsonScript } from '../scripts/renderExoJsonScript';
import type { TExoSsrDocumentOptions } from '../types/TExoSsrDocumentOptions';
import type { TExoSsrHeadEntry } from '../types/TExoSsrHeadEntry';
import type { TExoSsrHeadOption } from '../types/TExoSsrHeadOption';
import type { TExoSsrHeader } from '../types/TExoSsrHeader';
import type { TExoSsrPageOptions } from '../types/TExoSsrPageOptions';
import type { TExoSsrResponse } from '../types/TExoSsrResponse';
import type { TExoSsrStateScriptOptions } from '../types/TExoSsrStateScriptOptions';

// Once per REQUEST, never per node: written for clarity, not for a render hot path.
// A `<head>` entry is MARKUP because this core has no walkable node form of a component. The body
// is PUSHED IN, not pulled, because the render is synchronous and never consults this mid-render.
export class ExoSsrResponse implements TExoSsrResponse {
    private status: number;
    private readonly headers: TExoSsrHeader[];
    private readonly state: Map<string, unknown>;
    private readonly headHtml: string[];
    private body = '';

    constructor(options: TExoSsrPageOptions = {}) {
        this.status = options.status ?? 200;
        this.headers = [...(options.headers ?? [])];
        this.state =
            options.state instanceof Map
                ? new Map(options.state)
                : new Map(Object.entries(options.state ?? {}));
        // COPIED, never aliased: a later `addHead` must not mutate the caller's array.
        const head = options.head;
        this.headHtml = head === undefined ? [] : typeof head === 'string' ? [head] : [...head];
    }

    setStatus(status: number): void {
        this.status = status;
    }

    getStatus(): number {
        return this.status;
    }

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

    // COPIES: mutating the result must not reach the request state.
    getHeaders(): readonly TExoSsrHeader[] {
        return this.headers.map((header) => ({ ...header }));
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

        return renderExoJsonScript(JSON.stringify(this.getStateSnapshot()), {
            // The READER's default, shared rather than repeated — a disagreement is silent.
            id: options.id ?? EXO_STATE_SCRIPT_ID,
            nonce: options.nonce,
        });
    }

    renderDocument(options: TExoSsrDocumentOptions = {}): string {
        const doctype =
            options.doctype === false ? '' : `${options.doctype ?? '<!doctype html>'}\n`;
        const htmlAttributes = renderAttributes(
            {
                lang: options.lang ?? 'en',
                ...(options.htmlAttributes ?? {}),
            },
            'htmlAttributes'
        );
        const bodyAttributes = renderAttributes(options.bodyAttributes ?? {}, 'bodyAttributes');
        const rootId = options.rootId ?? 'app';
        const headHtml = `${this.renderHeadOption(options.head)}${this.renderHead()}`;
        const stateScript = this.renderStateScript({ nonce: options.nonce });

        // `backend.hydrate(component, parent)` adopts `parent.firstElementChild`, so this `<div>`
        // is the node a hydration is handed. The state script sits OUTSIDE it, or it gets adopted.
        return `${doctype}<html${htmlAttributes}><head>${headHtml}</head><body${bodyAttributes}><div id="${escapeExoAttributeValue(
            rootId
        )}">${this.renderBody()}</div>${stateScript}</body></html>`;
    }

    // The `head` a CALLER passed, as against `renderHead()`, which is what a RENDER collected.
    private renderHeadOption(head: TExoSsrHeadOption): string {
        if (head === null || head === undefined) return '';
        if (typeof head === 'string') return head;
        const items: readonly TExoSsrHeadEntry[] = head;
        let out = '';
        for (let i = 0; i < items.length; i++) out += items[i];
        return out;
    }

    addHead(entry: string | readonly string[]): void {
        if (typeof entry === 'string') {
            this.headHtml.push(entry);
            return;
        }
        for (let i = 0; i < entry.length; i++) this.headHtml.push(entry[i]);
    }

    renderHead(): string {
        return this.headHtml.join('');
    }

    // Called once by `renderExoPage`, after the render, before anything reads the body.
    setBody(html: string): void {
        this.body = html;
    }

    renderBody(): string {
        return this.body;
    }
}

function normalizeHeaderName(name: string): string {
    return name.toLowerCase();
}

// For `<html>`, `<body>` and the container `id` only. None of them is hydrated, so sharing the
// render path's escaper here is a convenience, not a contract.
function renderAttributes(attributes: Record<string, unknown>, declaredBy: string): string {
    let out = '';
    for (const name in attributes) {
        assertExoLegalAttrName(name, declaredBy);
        const value = attributes[name];
        if (
            value === null ||
            value === undefined ||
            value === false ||
            typeof value === 'function'
        ) {
            continue;
        }
        const markup = name.toLowerCase();
        if (value === true) {
            out += ' ' + markup + '=""';
            continue;
        }
        out += ' ' + markup + '="' + escapeExoAttributeValue(String(value)) + '"';
    }
    return out;
}
