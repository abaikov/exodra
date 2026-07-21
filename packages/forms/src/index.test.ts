import { describe, expect, it } from 'vitest';
import { bindText, bindSelect, bindChecked, bindNumber } from './index';

// Minimal writable-bindable stub (no @exodra/reactivity runtime needed).
function stub<T>(initial: T) {
    let value = initial;
    return {
        getValue: () => value,
        setValue: (next: T) => {
            value = next;
        },
        subscribe: () => () => {},
    };
}

const fire = (
    handlers: Record<string, (e: Event) => void>,
    name: string,
    target: unknown
) => handlers[name]({ target } as unknown as Event);

describe('@exodra/forms bind helpers', () => {
    it('bindText binds value and writes back on input', () => {
        const model = stub('a');
        const attrs = bindText(model);
        expect(attrs.bindables.value).toBe(model);
        fire(attrs.handlers, 'onInput', { value: 'hello' });
        expect(model.getValue()).toBe('hello');
    });

    it('bindSelect binds value and writes back on change', () => {
        const model = stub('all');
        const attrs = bindSelect(model);
        expect(attrs.bindables.value).toBe(model);
        fire(attrs.handlers, 'onChange', { value: 'done' });
        expect(model.getValue()).toBe('done');
    });

    it('bindChecked binds checked and writes a boolean on change', () => {
        const model = stub(false);
        const attrs = bindChecked(model);
        expect(attrs.bindables.checked).toBe(model);
        fire(attrs.handlers, 'onChange', { checked: true });
        expect(model.getValue()).toBe(true);
    });

    it('bindNumber writes valueAsNumber on input', () => {
        const model = stub(0);
        const attrs = bindNumber(model);
        expect(attrs.bindables.value).toBe(model);
        fire(attrs.handlers, 'onInput', { valueAsNumber: 42 });
        expect(model.getValue()).toBe(42);
    });
});
