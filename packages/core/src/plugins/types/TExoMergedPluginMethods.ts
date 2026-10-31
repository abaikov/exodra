import type { TExoPluginMethods } from './TExoPluginMethods';

/**
 * A CONSTRUCTOR CANNOT DO THIS, which is why the backends declare their constructors as interfaces:
 * a class's instance type is fixed, so every composition would look identical to the checker.
 */
export type TExoMergedPluginMethods<TPacks extends readonly unknown[]> = TPacks extends readonly [
    infer THead,
    ...infer TRest
]
    ? TExoPluginMethods<THead> & TExoMergedPluginMethods<TRest>
    : unknown;
