// Shared HTML serialization primitives, used by BOTH the runtime walker
// (ExoNodeString) and the compiled SSR output, so the two emit byte-identical
// HTML. The compiled emitter imports `escapeHtml` for text holes and
// `serializeAttribute` for attribute holes; keep these the single source of truth.

// Pre-rendered, already-escaped HTML. Compiled components return this so a parent
// template can splice it RAW while still escaping plain scalar holes — the classic
// SafeString pattern. `toString()` lets `[...].join('')` flatten a list of them.
export class SafeHtml {
    constructor(readonly value: string) {}
    toString(): string {
        return this.value;
    }
}

// Wrap a compiled template as SafeHtml (the compiled output's `_html`).
export function markHtml(value: string): SafeHtml {
    return new SafeHtml(value);
}

// A child/text hole: splice SafeHtml raw, escape everything else. The compiled
// output's `_esc`. This is how `{component()}` (HTML) and `{scalar}` (text) share
// one interpolation without the compiler having to know which is which.
export function escapeOrRaw(value: unknown): string {
    return value instanceof SafeHtml ? value.value : escapeHtml(value);
}

// Most rendered strings (labels, ids, class names, numbers) contain none of the
// four HTML-significant characters, so a single scan that bails early avoids four
// `.replace` passes over the whole string in the common case.
const NEEDS_ESCAPE = /[&<>"]/;
export function escapeHtml(value: unknown): string {
    const s = String(value);
    if (!NEEDS_ESCAPE.test(s)) return s;
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Attribute-value escaping is currently identical to text escaping.
export const escapeAttribute = escapeHtml;

// `onClick` etc. are event handlers (not rendered); `onExoMount`/`onExoUnmount`
// are lifecycle hooks handled elsewhere.
export function isEventName(name: string): boolean {
    // `on[A-Z]…` but not `onExo…` (lifecycle). A char check avoids running a
    // regex for every attribute of every element during SSR.
    if (
        name.length < 3 ||
        name.charCodeAt(0) !== 111 /* o */ ||
        name.charCodeAt(1) !== 110 /* n */
    ) {
        return false;
    }
    const c = name.charCodeAt(2);
    if (c < 65 || c > 90) return false; // third char not A–Z
    return !name.startsWith('onExo');
}

// An object attribute value → `k: v; k2: v2` (e.g. an un-folded `style` object).
export function serializeAttributeValue(value: unknown): string {
    if (!value || typeof value !== 'object') {
        return String(value);
    }
    return Object.entries(value as Record<string, unknown>)
        .map(([name, nextValue]) => `${name}: ${String(nextValue)}`)
        .join('; ');
}

// One attribute → its HTML: `name="v"`, a bare `name` (boolean true), or `''`
// when it must not render (children/textContent/directives/events/functions or a
// false/null/undefined value). `className` maps to `class`.
export function serializeAttribute(name: string, value: unknown): string {
    if (
        name === 'children' ||
        name === 'textContent' ||
        name === 'dangerouslySetInnerHTML' ||
        name === 'onExoMount' ||
        name === 'onExoUnmount' ||
        isEventName(name) ||
        typeof value === 'function' ||
        value === false ||
        value === null ||
        value === undefined
    ) {
        return '';
    }

    const attributeName = name === 'className' ? 'class' : name;
    if (value === true) {
        return attributeName;
    }
    return `${attributeName}="${escapeAttribute(serializeAttributeValue(value))}"`;
}

// The same attribute, prefixed with a space, for splicing into a compiled SSR
// template `<tag${spaceAttribute(...)}>`. Empty when the attribute does not render
// (so no stray space appears). The compiled emitter imports this as its `_a`.
export function spaceAttribute(name: string, value: unknown): string {
    const attr = serializeAttribute(name, value);
    return attr ? ` ${attr}` : '';
}

// Same result as `spaceAttribute` for a NORMAL attribute name, but the caller has
// already proven (at compile time) that `name` is a real attribute — not
// `children`/`textContent`/a directive/an event — and already mapped `className`
// to `class`. So this skips serializeAttribute's per-attribute name cascade, which
// is ~76% of the per-attribute cost. The SSR compiler emits it as `_au` for
// literal-named attribute holes; the runtime walker (unknown names) still uses the
// full path. Byte-identical for normal names — pinned by the ssr-emit parity tests.
export function spaceAttributeUnchecked(name: string, value: unknown): string {
    if (
        value === false ||
        value === null ||
        value === undefined ||
        typeof value === 'function'
    ) {
        return '';
    }
    if (value === true) return ` ${name}`;
    return ` ${name}="${escapeAttribute(serializeAttributeValue(value))}"`;
}
