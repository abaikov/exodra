import { createRoot } from './createRoot';
import type { TExoReactRootOptions } from './types/TExoReactRootOptions';

export function hydrateRoot(
    container: Element,
    children: unknown,
    options: TExoReactRootOptions = {}
): { render(children: unknown): void; unmount(): void } {
    const root = createRoot(container, options);
    root.render(children);
    return root;
}
