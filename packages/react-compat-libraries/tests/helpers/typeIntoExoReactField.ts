import { act } from 'react';

export async function typeIntoExoReactField(field: HTMLInputElement, value: string): Promise<void> {
    // The prototype setter bypasses React's value tracker, which drops an input event whose value it already recorded.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
        setValue?.call(field, value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
    });
}
