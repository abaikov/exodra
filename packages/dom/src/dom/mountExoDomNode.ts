import type { TExoNode } from '@exodra/core';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomChild } from './types/TExoDomChild';
import type { TExoDomMark } from './types/TExoDomMark';

export function mountExoDomNode(
    node: TExoNode<TExoDomMark>,
    parent: Element,
    backend: TExoDomApi
): () => void {
    const child = node as unknown as TExoDomChild;
    const install = backend.events.install;
    let uninstall = install === undefined ? null : install(parent);
    if (child.node.parentNode !== parent) {
        parent.appendChild(child.node);
        child.mount();
    }
    return () => {
        child.unmount();
        if (uninstall !== null) {
            uninstall();
            uninstall = null;
        }
    };
}
