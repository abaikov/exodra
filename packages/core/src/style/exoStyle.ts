import type { TExoStyleInput } from './types/TExoStyleInput';

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
    // `WebkitX`/`MozX`/`OX` take their leading dash from the capital; Microsoft's lowercase
    // `ms` is the one prefix that needs it added (`msFlexAlign` → `-ms-flex-align`).
    return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
}

function isUnitless(key: string): boolean {
    const camel = key.includes('-')
        ? key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        : key;
    return UNITLESS.has(camel);
}

function formatValue(key: string, value: string | number): string {
    if (typeof value === 'number' && value !== 0 && !key.startsWith('--') && !isUnitless(key)) {
        return `${value}px`;
    }
    return String(value);
}

/** Build a CSS style string from objects / strings. Rules and examples: docs-site/docs/api/style.md. */
export function exoStyle(...args: TExoStyleInput[]): string {
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
