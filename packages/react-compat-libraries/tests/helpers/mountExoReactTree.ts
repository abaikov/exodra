import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

export async function mountExoReactTree(
    tree: ReactNode
): Promise<{ container: HTMLElement; unmount(): Promise<void> }> {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
        root.render(tree);
    });
    return {
        container,
        async unmount(): Promise<void> {
            await act(async () => {
                root.unmount();
            });
            container.remove();
        },
    };
}
