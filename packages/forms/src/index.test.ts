import { describe, expect, it } from 'vitest';
import { bindText, bindSelect, bindChecked, bindNumber, bindRadio } from './index';
import { bindable } from '@exodra/reactivity';

// Minimal writable-bindable stub (no @exodra/reactivity runtime needed).
function stub<T>(initial: T) {
    let value = initial;
    return {
        getValue: () => value,
        setValue: (next: T) => {
            value = next;
        },
        onChange: () => () => {},
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

    describe('bindRadio (value-based radio group)', () => {
        it('checked is derived: true only when the model equals this value', () => {
            const model = bindable<string>('a');
            const a = bindRadio(model, 'a');
            const b = bindRadio(model, 'b');
            expect((a.bindables.checked as { getValue(): boolean }).getValue()).toBe(true);
            expect((b.bindables.checked as { getValue(): boolean }).getValue()).toBe(false);
        });

        it('onChange writes this radio value into the shared model', () => {
            const model = bindable<string>('a');
            const b = bindRadio(model, 'b');
            fire(b.handlers, 'onChange', {});
            expect(model.getValue()).toBe('b');
        });

        it('selecting another radio DESELECTS this one reactively (bindChecked cannot)', () => {
            const model = bindable<string>('a');
            const a = bindRadio(model, 'a');
            const b = bindRadio(model, 'b');
            const aChecked = a.bindables.checked as { getValue(): boolean };
            const bChecked = b.bindables.checked as { getValue(): boolean };

            expect(aChecked.getValue()).toBe(true);
            // Pick radio B (its change handler updates the shared model).
            fire(b.handlers, 'onChange', {});
            // A is now deselected because its `checked` derives from model === 'a'.
            expect(aChecked.getValue()).toBe(false);
            expect(bChecked.getValue()).toBe(true);
        });
    });
});
