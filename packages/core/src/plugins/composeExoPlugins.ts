import type { TExoMergedPluginMethods } from './types/TExoMergedPluginMethods';
import type { TExoPlugin } from './types/TExoPlugin';

/**
 * Replacing and wrapping are ONE act, which is what `super` gave a prototype chain and the only
 * reason this is not `Object.assign`. ORDER IS THE CALLER'S and it fails silently: two plugins that
 * both replace a name without calling `next` leave only the last, with nothing thrown.
 */
export function composeExoPlugins<
    TBase extends object,
    TPacks extends readonly (TExoPlugin | ((base: never) => object))[]
>(base: TBase, ...plugins: TPacks): TBase & TExoMergedPluginMethods<TPacks> {
    let target = base as unknown as Record<string, unknown>;
    for (let p = 0; p < plugins.length; p++) {
        const plugin = plugins[p];
        if (typeof plugin === 'function') {
            target = (plugin as (base: unknown) => Record<string, unknown>)(target);
            continue;
        }
        const names = Object.keys(plugin);
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            // Read through the prototype, then write an own property that shadows it — which is what makes
            // the call site walk nothing afterwards.
            target[name] = ((plugin as TExoPlugin)[name] as (next: unknown) => unknown)(
                target[name]
            );
        }
    }
    return target as unknown as TBase & TExoMergedPluginMethods<TPacks>;
}
