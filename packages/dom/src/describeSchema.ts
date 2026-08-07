// A short, human-locatable label for a schema node, used by the renderer's HARD
// errors (`<button#save.primary>` beats a minified "schema type: undefined").
// Not diagnostics: runtime dev warnings live in @exodra/dom-profiler and the
// static analyzer, not in the render path.

// Deliberately NOT importing TExoNodeDomSchema: the renderer imports this module
// for its error messages, so importing its type back would make the two modules
// circular. A label only needs a type and a static bucket to read `id`/`class`
// from — so that is all this asks for, and every schema satisfies it.
type TExoLabelableSchema = {
    type?: unknown;
    attrs?: { static?: Record<string, unknown> } | null;
};

// A short, human-locatable label for a schema node: `<button#save.primary>`,
// `component Counter`, `#text`, `<>`. Best-effort and allocation-light — only
// ever called on the error/misconfig path.
export function describeSchema(schema: TExoLabelableSchema | null | undefined): string {
    if (!schema) return String(schema);
    const type = schema.type;
    if (typeof type === 'function') {
        return `component ${(type as { name?: string }).name || '(anonymous)'}`;
    }
    if (type === '#text') return '#text';
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
