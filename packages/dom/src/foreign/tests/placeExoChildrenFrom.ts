import type { TExoChildrenPort, TExoNode } from '@exodra/core';
import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomMark } from '../../dom/types/TExoDomMark';
import type { TExoDomPortChildList } from '../../dom/types/TExoDomPortChildList';

export const placeExoChildrenFrom = (
    c: TExoDomNode,
    port: TExoChildrenPort,
    src: { getValue(): readonly TExoNode<TExoDomMark>[]; onChange(cb: () => void): () => void }
): void => {
    const kids = (c as TExoDomNode & TExoDomPortChildList).portChildList(port);
    const apply = (): void => {
        const want = src.getValue();
        // `remove` and never `detach`: a child that LEAVES must be told, or its unmount hook never
        // runs and a foreign node goes on believing a list holds it.
        if (want.length === 0) {
            // ONE CALL, so every child is told while the list is still whole.
            kids.removeAll();
            return;
        }
        for (let i = kids.size - 1; i >= 0; i--) {
            if (!want.includes(kids.at(i) as TExoNode<TExoDomMark>)) kids.remove(i);
        }
        for (let i = 0; i < want.length; i++) {
            if (kids.at(i) === want[i]) continue;
            let from = -1;
            for (let j = i + 1; j < kids.size; j++) {
                if (kids.at(j) === want[i]) {
                    from = j;
                    break;
                }
            }
            if (from === -1) kids.insert(want[i], i);
            else kids.move(from, i);
        }
    };
    apply();
    c.onTeardown(src.onChange(apply));
};
