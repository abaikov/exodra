import * as t from '@babel/types';

// Compile-time folding of `static.style` objects.
//
// A `style` object literal in the `static` bucket is turned into a CSS string at
// build time when EVERY value is a static literal — zero runtime, the string is
// then hoistable/clone-cacheable like any other static attribute. When any value
// is dynamic (an identifier, a ternary, a call), the object is wrapped in a
// `style(...)` call importing the runtime helper from `@exodra/style`, so the
// exact same normalization happens at runtime.
//
// The rules here MUST stay byte-for-byte identical to `@exodra/style`'s `style()`
// (camelCase→kebab with the `-ms-` fix, px for lengths, unitless props, custom
// properties, array values). The parity test in
// `test/style-parity.test.ts` pins that.

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
    if (key.startsWith('--') || key.includes('-')) return key;
    const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
}

function isUnitless(key: string): boolean {
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

// The static key of an object property: `foo` / `"foo-bar"`. Computed or
// non-literal keys make the whole object non-foldable.
function staticKey(prop: t.ObjectProperty): string | null {
    if (prop.computed) return null;
    if (t.isIdentifier(prop.key)) return prop.key.name;
    if (t.isStringLiteral(prop.key)) return prop.key.value;
    return null;
}

type StaticScalar = string | number | null;

// A single statically-known value, or the marker `DYNAMIC` if it can't be known
// at build time. `null` means "drop this declaration" (matches the runtime
// skipping of null/undefined/false).
const DYNAMIC = Symbol('dynamic');

function staticScalar(node: t.Node): StaticScalar | typeof DYNAMIC {
    if (t.isStringLiteral(node)) return node.value;
    if (t.isNumericLiteral(node)) return node.value;
    if (
        t.isUnaryExpression(node) &&
        node.operator === '-' &&
        t.isNumericLiteral(node.argument)
    ) {
        return -node.argument.value;
    }
    // null / undefined / false → declaration dropped, exactly like `style()`.
    if (t.isNullLiteral(node)) return null;
    if (t.isIdentifier(node) && node.name === 'undefined') return null;
    if (t.isBooleanLiteral(node) && node.value === false) return null;
    return DYNAMIC;
}

// Try to fold an object expression to a CSS string. Returns the string on full
// success, or `null` if any value is dynamic (caller wraps in a runtime call).
export function foldObject(obj: t.ObjectExpression): string | null {
    const decls: string[] = [];
    for (const prop of obj.properties) {
        if (!t.isObjectProperty(prop)) return null; // spread / method → dynamic
        const key = staticKey(prop);
        if (key === null) return null;
        const value = prop.value;

        if (t.isArrayExpression(value)) {
            const parts: string[] = [];
            for (const el of value.elements) {
                if (el === null) return null;
                if (t.isSpreadElement(el)) return null;
                const scalar = staticScalar(el);
                if (scalar === DYNAMIC || scalar === null) return null;
                parts.push(formatValue(key, scalar));
            }
            decls.push(`${toKebab(key)}:${parts.join(' ')}`);
            continue;
        }

        const scalar = staticScalar(value as t.Node);
        if (scalar === DYNAMIC) return null;
        if (scalar === null) continue; // dropped declaration
        decls.push(`${toKebab(key)}:${formatValue(key, scalar)}`);
    }
    return decls.join(';');
}

export interface StyleTransformResult {
    property: t.ObjectProperty;
    /** True when the value was wrapped in a runtime `style(...)` call. */
    usesRuntime: boolean;
}

// Transform a single `static` bucket property. Only `style` properties whose
// value is an object literal are touched; everything else passes through.
export function transformStaticStyleProperty(
    prop: t.ObjectProperty,
    styleRef: () => t.Identifier
): StyleTransformResult {
    if (staticKey(prop) !== 'style' || !t.isObjectExpression(prop.value)) {
        return { property: prop, usesRuntime: false };
    }

    const folded = foldObject(prop.value);
    if (folded !== null) {
        // Fully static → inline the CSS string. Zero runtime.
        return {
            property: t.objectProperty(prop.key, t.stringLiteral(folded)),
            usesRuntime: false,
        };
    }

    // Dynamic values → defer to the runtime helper (same normalization).
    return {
        property: t.objectProperty(
            prop.key,
            t.callExpression(styleRef(), [prop.value])
        ),
        usesRuntime: true,
    };
}
