import type {
    TExoInferredQuery,
    TExoQueryField,
    TExoQueryInput,
    TExoQueryParseOptions,
    TExoParsedQueryPrimitive,
    TExoParsedQueryRecord,
    TExoQueryPrimitive,
    TExoQueryRecord,
    TExoQuerySchema,
    TExoQueryValidationIssue,
    TExoQueryValue,
} from '../types';

type TQueryFieldOptions<TValue> = {
    default?: TValue;
    validate?: (value: TValue) => string | boolean | void;
};

// Parses the string it is GIVEN and reads no URL of its own. A repeated key becomes an array.
//
// THE RECORD HAS A NULL PROTOTYPE: a query key is whatever a URL says it is, so no key may be
// answered by something the key did not put there. No `hasOwnProperty`, not `instanceof Object` —
// use `Object.hasOwn(query, key)` or `key in query`.
export function parseExoQuery<TSchema extends TExoQuerySchema>(
    search: string,
    options: TExoQueryParseOptions<TSchema> & { schema: TSchema }
): TExoInferredQuery<TSchema>;
export function parseExoQuery<TQuery extends TExoParsedQueryRecord = TExoQueryRecord>(
    search: string,
    options?: TExoQueryParseOptions
): TQuery;
export function parseExoQuery(
    search: string,
    options: TExoQueryParseOptions = {}
): TExoParsedQueryRecord {
    const params = new URLSearchParams(normalizeSearch(search));
    const query = emptyQueryRecord<Record<string, string | string[]>>();

    params.forEach((value, key) => {
        const currentValue = query[key];
        if (currentValue === undefined) {
            query[key] = value;
            return;
        }

        if (Array.isArray(currentValue)) {
            currentValue.push(value);
            return;
        }

        query[key] = [currentValue, value];
    });

    if (options.schema) {
        return parseWithSchema(query, options.schema);
    }

    return parseWithStrategy(query, options);
}

// An empty record gives the EMPTY STRING, not a bare `?`, so the result concatenates onto a
// pathname. `undefined` and `null` DROP their key, which is how `router.patchQuery` clears one.
export function stringifyExoQuery(query: TExoQueryInput): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        appendQueryValue(params, key, value);
    }

    const search = params.toString();
    return search ? `?${search}` : '';
}

export function mergeExoQuery(
    currentQuery: TExoQueryRecord,
    patch: TExoQueryInput
): TExoQueryInput {
    return {
        ...currentQuery,
        ...patch,
    };
}

export class ExoQueryValidationError extends Error {
    constructor(public readonly issues: readonly TExoQueryValidationIssue[]) {
        super(
            `Invalid query string: ${issues
                .map((issue) => `${issue.key}: ${issue.message}`)
                .join('; ')}`
        );
        this.name = 'ExoQueryValidationError';
    }
}

export const exoQuery = {
    string(options: TQueryFieldOptions<string> = {}): TExoQueryField<string> {
        return createField({
            defaultValue: options.default,
            parse: (value, key) => requireSingleValue(value, key),
            validate: options.validate,
        });
    },
    number(options: TQueryFieldOptions<number> = {}): TExoQueryField<number> {
        return createField({
            defaultValue: options.default,
            parse: (value, key) => parseQueryNumber(requireSingleValue(value, key)),
            validate: options.validate,
        });
    },
    boolean(options: TQueryFieldOptions<boolean> = {}): TExoQueryField<boolean> {
        return createField({
            defaultValue: options.default,
            parse: (value, key) => parseQueryBoolean(requireSingleValue(value, key)),
            validate: options.validate,
        });
    },
    array<TValue>(
        item: TExoQueryField<TValue>,
        options: TQueryFieldOptions<readonly TValue[]> = {}
    ): TExoQueryField<readonly TValue[]> {
        return createField({
            defaultValue: options.default ?? [],
            parse: (value, key) =>
                normalizeRawArray(value).map((itemValue) => item.parse(itemValue, key)),
            validate: options.validate,
        });
    },
    optional<TValue>(field: TExoQueryField<TValue>): TExoQueryField<TValue | undefined> {
        return {
            parse(value, key) {
                if (value === undefined) {
                    return undefined;
                }

                return field.parse(value, key);
            },
            validate(value, key) {
                if (value === undefined) {
                    return;
                }

                return field.validate?.(value, key);
            },
        };
    },
};

// NOT `{}`: twelve keys already have answers there, so `?constructor=1` and `?__proto__=x` both
// take the repeated-key branch on a value that was never a query value. It must be EVERY
// accumulator on the path, not just the first. README: "The parsed record has a null prototype".
function emptyQueryRecord<TRecord extends object>(): TRecord {
    return Object.create(null) as TRecord;
}

function parseWithStrategy(
    query: TExoQueryRecord,
    options: TExoQueryParseOptions
): TExoParsedQueryRecord {
    const result = emptyQueryRecord<TExoParsedQueryRecord>();

    for (const [key, value] of Object.entries(query)) {
        result[key] = isStringArray(value)
            ? value.map((item) => parseQueryValue(item, key, options))
            : parseQueryValue(value, key, options);
    }

    return result;
}

function parseWithSchema<TSchema extends TExoQuerySchema>(
    query: TExoQueryRecord,
    schema: TSchema
): TExoInferredQuery<TSchema> {
    // Null-prototyped for the RETURN SHAPE, not for a bug of its own: these keys come from the
    // schema. A record shaped differently depending on whether a schema was passed is worse.
    const result = emptyQueryRecord<Record<string, unknown>>();
    const issues: TExoQueryValidationIssue[] = [];

    for (const [key, field] of Object.entries(schema)) {
        try {
            const value = field.parse(query[key], key);
            const validationResult = field.validate?.(value, key);

            if (validationResult === false) {
                issues.push({ key, value, message: 'failed validation' });
                continue;
            }

            if (typeof validationResult === 'string') {
                issues.push({ key, value, message: validationResult });
                continue;
            }

            result[key] = value;
        } catch (error) {
            issues.push({
                key,
                value: query[key],
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    if (issues.length > 0) {
        throw new ExoQueryValidationError(issues);
    }

    return result as TExoInferredQuery<TSchema>;
}

function createField<TValue>(options: {
    defaultValue?: TValue;
    parse(value: TExoQueryValue, key: string): TValue;
    validate?: (value: TValue) => string | boolean | void;
}): TExoQueryField<TValue> {
    return {
        parse(value, key) {
            if (value === undefined && options.defaultValue !== undefined) {
                return options.defaultValue;
            }

            const parsedValue = options.parse(value, key);
            return parsedValue;
        },
        validate: options.validate,
    };
}

function parseQueryValue(
    value: string,
    key: string,
    options: TExoQueryParseOptions
): TExoParsedQueryPrimitive {
    if (options.parseValue) {
        return options.parseValue(value, key);
    }

    if (options.parseBooleans && isBooleanString(value)) {
        return value === 'true';
    }

    if (options.parseNumbers && isNumberString(value)) {
        return Number(value);
    }

    return value;
}

function requireSingleValue(value: TExoQueryValue, _key: string): string {
    if (value === undefined) {
        throw new Error('is required');
    }

    if (Array.isArray(value)) {
        throw new Error('expected a single value');
    }

    return String(value);
}

function normalizeRawArray(value: TExoQueryValue): readonly string[] {
    if (value === undefined) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.map(String);
    }

    return [String(value)];
}

function parseQueryNumber(value: string): number {
    if (!isNumberString(value)) {
        throw new Error('expected a number');
    }

    return Number(value);
}

function parseQueryBoolean(value: string): boolean {
    if (value === 'true' || value === '1') {
        return true;
    }

    if (value === 'false' || value === '0') {
        return false;
    }

    throw new Error('expected a boolean');
}

function isBooleanString(value: string): boolean {
    return value === 'true' || value === 'false';
}

function isNumberString(value: string): boolean {
    if (value.trim() === '') {
        return false;
    }

    return Number.isFinite(Number(value));
}

function appendQueryValue(params: URLSearchParams, key: string, value: TExoQueryValue): void {
    if (isQueryArray(value)) {
        for (const item of value) {
            appendQueryPrimitive(params, key, item);
        }
        return;
    }

    appendQueryPrimitive(params, key, value);
}

function appendQueryPrimitive(
    params: URLSearchParams,
    key: string,
    value: TExoQueryPrimitive
): void {
    if (value === undefined || value === null) {
        return;
    }

    params.append(key, String(value));
}

function isQueryArray(value: TExoQueryValue): value is readonly TExoQueryPrimitive[] {
    return Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
    return Array.isArray(value);
}

// `URLSearchParams` wants it off; `ensureSearchPrefix` puts it back.
function normalizeSearch(search: string): string {
    if (!search) {
        return '';
    }

    return search.startsWith('?') ? search.slice(1) : search;
}
