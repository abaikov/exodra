import type { TExoWritableBindable } from '@exodra/reactivity';

// Two-way form binding helpers. Each returns a partial attrs object that the
// babel plugin folds into the element via mergeAttrs(). The compiler picks the
// right helper per element type from `bind:value` / `bind:checked`, so only the
// variants you actually use are imported (each is a separate named export →
// tree-shaken). These functions are the *runtime* of the `bind:` directive; the
// compiler never inlines this logic per call site.

export interface TExoBindAttrs {
    bindables: Record<string, unknown>;
    handlers: Record<string, (event: Event) => void>;
}

// <input bind:value> / <textarea bind:value>: text value <-> string bindable.
export function bindText(model: TExoWritableBindable<string>): TExoBindAttrs {
    return {
        bindables: { value: model },
        handlers: {
            onInput: event =>
                model.setValue((event.target as HTMLInputElement).value),
        },
    };
}

// <select bind:value>: selection <-> string bindable (fires on change).
export function bindSelect(model: TExoWritableBindable<string>): TExoBindAttrs {
    return {
        bindables: { value: model },
        handlers: {
            onChange: event =>
                model.setValue((event.target as HTMLSelectElement).value),
        },
    };
}

// <input type="checkbox|radio" bind:checked>: checked <-> boolean bindable.
export function bindChecked(
    model: TExoWritableBindable<boolean>
): TExoBindAttrs {
    return {
        bindables: { checked: model },
        handlers: {
            onChange: event =>
                model.setValue((event.target as HTMLInputElement).checked),
        },
    };
}

// <input type="number|range" bind:value>: numeric value <-> number bindable.
export function bindNumber(model: TExoWritableBindable<number>): TExoBindAttrs {
    return {
        bindables: { value: model },
        handlers: {
            onInput: event =>
                model.setValue((event.target as HTMLInputElement).valueAsNumber),
        },
    };
}
