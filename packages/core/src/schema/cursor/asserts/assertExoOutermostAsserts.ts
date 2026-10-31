export function assertExoOutermostAsserts(outermost: boolean, declaredBy: string): void {
    if (outermost) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: withExoSchemaAsserts is not the outermost decorator on this schema` +
              ' — it hands every element callback a fresh guarded cursor of its own, which ' +
              'replaces on `receiver` whatever a decorator composed outside it put there. That ' +
              'decorator would see the top-level calls and none of the nested ones, silently, ' +
              'and half a decorator is worse than none. Compose this one last: ' +
              'withExoSchemaAsserts(withYourOwnDecorator(cursor)).'
            : 'EXO0089'
    );
}
