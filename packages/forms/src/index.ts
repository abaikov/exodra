import type { TExoWritableBindable } from '@exodra/reactivity';
import { derive } from '@exodra/reactivity';

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

// <input type="checkbox" bind:checked>: checked <-> boolean bindable. For a RADIO
// GROUP use bindRadio instead — a per-radio boolean can't represent deselection
// (the browser only fires `change` on the newly-selected radio, so the previously
// selected radio's boolean would stay stuck at true).
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

// <input type="radio" value="X">: a group of radios shares ONE model holding the
// SELECTED value. `checked` is DERIVED (model === value), so selecting another
// radio in the group re-notifies every radio and flips this one off — the thing a
// per-radio boolean (bindChecked) cannot do. `change` fires only when a radio
// becomes selected, so onChange just writes this radio's value into the model.
export function bindRadio<T>(
    model: TExoWritableBindable<T>,
    value: T
): TExoBindAttrs {
    return {
        bindables: { checked: derive(model, current => current === value) },
        handlers: {
            onChange: () => model.setValue(value),
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
