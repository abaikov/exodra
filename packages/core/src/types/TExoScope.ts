/**
 * A link in the component provide()/inject() chain.
 *
 * Every renderer threads one of these parent→child while it builds: the DOM
 * renderer during its build walk, the string renderer during its render walk,
 * the compiled-SSR context per component. `values` is allocated lazily — a
 * component that never calls provide() costs no Map.
 */
export type TExoScope = {
    values?: Map<symbol, unknown>;
    parent?: TExoScope;
};
