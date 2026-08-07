// Turn a build crash into a message that names the mistake.
//
// The render path carries NO validation: checking every bucket entry on every
// node would tax the hot path for a mistake that is made once, at authoring
// time. So the checking happens here — only after a build has already thrown,
// where cost no longer matters. mount()/hydrate() call this, and if it finds a
// misconfigured bucket entry it rethrows with the schema and the exact key.

import type { TExoNodeDomSchema } from './ExoNodeDom';
import { describeSchema } from './describeSchema';

// Reactive buckets must hold `{ getValue, onChange }` (TExoBindable); `handlers`
// must hold functions. Anything else fails deep in setupBindings with a message
// like "b.getValue is not a function", which names neither the node nor the key.
function isBindable(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { getValue?: unknown }).getValue === 'function' &&
        typeof (value as { onChange?: unknown }).onChange === 'function'
    );
}

function checkNode(schema: TExoNodeDomSchema): string | undefined {
    const attrs = schema.attrs;
    if (!attrs) return undefined;

    for (const bucket of ['bindables', 'bindableLists', 'bindableHandlers'] as const) {
        const entries = attrs[bucket] as Record<string, unknown> | undefined;
        if (!entries) continue;
        for (const key in entries) {
            const value = entries[key];
            if (value === undefined || isBindable(value)) continue;
            const hint =
                typeof value === 'function'
                    ? `Functions belong in \`handlers\`.`
                    : `A plain value belongs in \`static\`; a reactive one must be a bindable (\`getValue()\` + \`onChange()\`).`;
            return (
                `${bucket}.${key} on ${describeSchema(schema)} is not a bindable ` +
                `(got ${describeValue(value)}). ${hint}`
            );
        }
    }

    const handlers = attrs.handlers as Record<string, unknown> | undefined;
    if (handlers) {
        for (const key in handlers) {
            const value = handlers[key];
            if (value === undefined || typeof value === 'function') continue;
            return (
                `handlers.${key} on ${describeSchema(schema)} is not a function ` +
                `(got ${describeValue(value)}). An event handler must be callable; ` +
                `a reactive handler belongs in \`bindableHandlers\`.`
            );
        }
    }

    return undefined;
}

function describeValue(value: unknown): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return `the string ${JSON.stringify(value)}`;
    if (typeof value === 'object') return 'an object without getValue/onChange';
    return `a ${typeof value}`;
}

/**
 * Walk the schema tree a failed build was given and return a better error for
 * the first misconfigured bucket entry, or `undefined` if nothing explains the
 * failure (in which case the original error is the honest one to show).
 *
 * Only STATIC children are walked: reading a reactive source here could run user
 * code a second time, and the buckets on the nodes it produced were not built.
 */
export function diagnoseBuildFailure(
    root: TExoNodeDomSchema,
    cause: unknown
): Error | undefined {
    const stack: TExoNodeDomSchema[] = [root];
    // Bounded so a malformed (cyclic) schema cannot hang the error path.
    let budget = 10_000;

    while (stack.length > 0 && budget-- > 0) {
        const schema = stack.pop()!;
        if (!schema || typeof schema !== 'object') continue;

        const problem = checkNode(schema);
        if (problem !== undefined) {
            const error = new Error(`ExoNodeDom: ${problem}`);
            // Assigned rather than passed to the constructor: `cause` in the
            // Error options is ES2022, and this package targets lower.
            (error as Error & { cause?: unknown }).cause = cause;
            return error;
        }

        const children = schema.attrs?.static?.children;
        if (Array.isArray(children)) {
            for (let i = 0; i < children.length; i++) {
                stack.push(children[i] as TExoNodeDomSchema);
            }
        } else if (children && typeof children === 'object') {
            stack.push(children as TExoNodeDomSchema);
        }
    }

    return undefined;
}
