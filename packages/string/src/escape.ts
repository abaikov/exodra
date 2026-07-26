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

export function escapeHtml(value: unknown): string {
    return String(value)
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
    return /^on[A-Z]/.test(name) && !name.startsWith('onExo');
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
