// Dev-only diagnostics for the DOM renderer.
//
// Two failure modes were historically cryptic:
//  1. A hard throw deep in the build with no hint about WHICH node tripped it —
//     a minified `Cannot create DOM element for schema type: undefined` tells you
//     nothing about where in your tree it is.
//  2. A malformed reactive prop (a plain function in `bindables`, a value where a
//     bindable belongs) is silently skipped — the button just does nothing, with
//     no error at all. That "dead UI, no clue" case is worse than a crash.
//
// `describeSchema` labels a node for (1) and is safe to call on the error path in
// any build. `devWarnOnce` powers (2): a deduped console.error, gated at the call
// site by `__DEV__` so the consumer's bundler drops it entirely in production.

import type { TExoNodeDomSchema } from './ExoNodeDom';

export const __DEV__ = process.env.NODE_ENV !== 'production';

// A short, human-locatable label for a schema node: `<button#save.primary>`,
// `component Counter`, `#text`, `<>`. Best-effort and allocation-light — only
// ever called on the error/misconfig path.
export function describeSchema(schema: TExoNodeDomSchema | null | undefined): string {
    if (!schema) return String(schema);
    const type = (schema as { type?: unknown }).type;
    if (typeof type === 'function') {
        return `component ${(type as { name?: string }).name || '(anonymous)'}`;
    }
    if (type === '#text') return '#text';
    if (type === '#comment') return '#comment';
    if (type === '#fragment') return '<>';
    if (typeof type === 'string') {
        const s = (schema.attrs?.static ?? {}) as Record<string, unknown>;
        const id = typeof s.id === 'string' && s.id ? `#${s.id}` : '';
        const rawClass = s.className ?? s.class;
        const cls =
            typeof rawClass === 'string' && rawClass.trim()
                ? `.${rawClass.trim().split(/\s+/).join('.')}`
                : '';
        return `<${type}${id}${cls}>`;
    }
    return `schema(type=${String(type)})`;
}

const warned = new Set<string>();

// Emit a console.error at most once per distinct message (avoids flooding when
// the same misconfigured node is rebuilt in a list/loop).
export function devWarnOnce(message: string): void {
    if (warned.has(message)) return;
    warned.add(message);
    // eslint-disable-next-line no-console
    console.error(message);
}

// Test-only: clear the dedupe set between cases.
export function __resetDomDevWarnings(): void {
    warned.clear();
}
