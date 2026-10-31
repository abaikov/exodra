import { act } from 'react';

export async function clickExoReactElement(element: Element | null): Promise<void> {
    if (element === null) throw new Error(`nothing to click; body: ${document.body.innerHTML}`);
    await act(async () => {
        element.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
        );
    });
}
