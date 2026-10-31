import { act } from 'react';

export async function waitForExoReactCondition(check: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (check()) return;
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
        });
    }
    if (!check()) throw new Error(`condition never held; body: ${document.body.innerHTML}`);
}
