export function assertExoRootElement(rootTag: string | null): asserts rootTag is string {
    if (rootTag !== null) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'createExoSchema: the cursor produced no element'
            : 'EXO0007'
    );
}
