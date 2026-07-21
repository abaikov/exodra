import type { TExoSchema } from '@exodra/core';

export type TExoSsrHeader = {
    name: string;
    value: string;
};

export type TExoSsrState = {
    status: number;
    headers: TExoSsrHeader[];
    head: TExoSchema[];
    state: Map<string, unknown>;
};

export type TExoSsrNodeOptions = {
    status?: number;
    headers?: readonly TExoSsrHeader[];
    head?: TExoSchema | readonly TExoSchema[];
    state?: Record<string, unknown> | Map<string, unknown>;
};

export type TExoSsrStateScriptOptions = {
    id?: string;
    nonce?: string;
};

export type TExoSsrDocumentOptions = {
    doctype?: string | false;
    lang?: string;
    rootId?: string;
    nonce?: string;
    head?: TExoSchema | readonly TExoSchema[];
    htmlAttributes?: Record<string, unknown>;
    bodyAttributes?: Record<string, unknown>;
};

export type TExoSsrContext = {
    setStatus(status: number): void;
    getStatus(): number;
    setHeader(name: string, value: string): void;
    appendHeader(name: string, value: string): void;
    getHeader(name: string): string | undefined;
    getHeaderValues(name: string): readonly string[];
    getHeaders(): readonly TExoSsrHeader[];
    addHead(schema: TExoSchema | readonly TExoSchema[]): void;
    renderHead(): string;
    setState(key: string, value: unknown): void;
    getState<TValue = unknown>(key: string): TValue | undefined;
    getStateSnapshot(): Record<string, unknown>;
    renderStateScript(options?: TExoSsrStateScriptOptions): string;
    renderBody(): string;
    renderDocument(options?: TExoSsrDocumentOptions): string;
};
