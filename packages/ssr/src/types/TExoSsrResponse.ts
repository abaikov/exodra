import type { TExoSsrHeader } from './TExoSsrHeader';
import type { TExoSsrStateScriptOptions } from './TExoSsrStateScriptOptions';

// The WRITE side only: `renderBody()`/`renderDocument()` are absent because a wire runs DURING the
// render, so a wire calling them would get a document with an empty container and no error.
export type TExoSsrResponse = {
    // Defaults to 200.
    setStatus(status: number): void;
    getStatus(): number;
    // Replace every header with this name (case-insensitive), then append it.
    setHeader(name: string, value: string): void;
    // Add another value under this name, keeping the ones already there (`Set-Cookie`).
    appendHeader(name: string, value: string): void;
    // Every value under this name joined with `, `, or `undefined` when there are none.
    getHeader(name: string): string | undefined;
    getHeaderValues(name: string): readonly string[];
    // Copies — mutating the result must not reach the request state.
    getHeaders(): readonly TExoSsrHeader[];
    // MARKUP: `'<title>Home</title>'`, or `strBackend.render(TITLE)`.
    addHead(entry: string | readonly string[]): void;
    renderHead(): string;
    setState(key: string, value: unknown): void;
    getState<TValue = unknown>(key: string): TValue | undefined;
    getStateSnapshot(): Record<string, unknown>;
    // `''` when the state map is empty.
    renderStateScript(options?: TExoSsrStateScriptOptions): string;
};
