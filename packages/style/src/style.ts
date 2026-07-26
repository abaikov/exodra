// Convenience for the `style` string: turn objects into a valid CSS style
// string so you don't hand-write `"color:red;font-size:12px"`. Pure and
// dependency-free — the output goes straight into `static.style` /
// `bindable.style` (works in DOM and SSR alike).

export type StyleScalar = string | number | null | undefined | false;

/** A single style object: camelCase or kebab-case keys, plus `--custom` props. */
export type StyleObject = Record<
    string,
    StyleScalar | readonly (string | number)[]
>;

/** Anything accepted as an argument: an object, a raw CSS string, or a falsy
 * value (skipped — handy for conditionals). */
export type StyleArg = StyleObject | string | null | undefined | false;

// Numeric values for these properties are used as-is (no `px` appended).
const UNITLESS = new Set([
    'animationIterationCount',
    'aspectRatio',
    'columnCount',
    'columns',
    'flex',
    'flexGrow',
    'flexShrink',
    'fontWeight',
    'gridArea',
    'gridColumn',
    'gridColumnEnd',
    'gridColumnStart',
    'gridRow',
    'gridRowEnd',
    'gridRowStart',
    'lineHeight',
    'opacity',
    'order',
    'orphans',
    'tabSize',
    'widows',
    'zIndex',
    'zoom',
    'fillOpacity',
    'floodOpacity',
    'stopOpacity',
    'strokeOpacity',
]);

function toKebab(key: string): string {
    // Custom properties (`--gap`) and already-kebab keys pass through untouched.
    if (key.startsWith('--') || key.includes('-')) return key;
    const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    // We don't autoprefix, but we serialize EXPLICIT vendor prefixes correctly.
    // `WebkitTransform`/`MozAppearance`/`OTransition` already get a leading dash
    // from their capital first letter; only Microsoft's lowercase `ms` needs it
    // added (`msFlexAlign` → `-ms-flex-align`).
    return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
}

function isUnitless(key: string): boolean {
    // Normalize kebab keys (`z-index`) to camelCase for the lookup.
    const camel = key.includes('-')
        ? key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        : key;
    return UNITLESS.has(camel);
}

function formatValue(key: string, value: string | number): string {
    if (
        typeof value === 'number' &&
        value !== 0 &&
        !key.startsWith('--') &&
        !isUnitless(key)
    ) {
        return `${value}px`;
    }
    return String(value);
}

/**
 * Build a CSS style string from objects / strings.
 *
 * - `fontSize: 12` → `font-size:12px` (numbers get `px`, except unitless props
 *   like `opacity`, `zIndex`, `lineHeight`, and `--custom` properties).
 * - `padding: [4, 8]` → `padding:4px 8px`.
 * - `null` / `undefined` / `false` values are skipped (conditional styles).
 * - A raw string argument is appended verbatim; a falsy argument is skipped.
 * - Later arguments come after earlier ones, so they win in the browser.
 *
 * @example
 * style({ color: 'red', fontSize: 12, '--gap': 8 })
 * // "color:red;font-size:12px;--gap:8"
 * style(base, isActive && { color: 'blue' }, { opacity: hidden ? 0 : 1 })
 */
export function style(...args: StyleArg[]): string {
    const decls: string[] = [];

    for (const arg of args) {
        if (!arg) continue;

        if (typeof arg === 'string') {
            const trimmed = arg.trim().replace(/;+$/, '');
            if (trimmed) decls.push(trimmed);
            continue;
        }

        for (const key in arg) {
            const value = arg[key];
            if (value === null || value === undefined || value === false) {
                continue;
            }
            const formatted = Array.isArray(value)
                ? value.map((v) => formatValue(key, v)).join(' ')
                : formatValue(key, value as string | number);
            decls.push(`${toKebab(key)}:${formatted}`);
        }
    }

    return decls.join(';');
}
