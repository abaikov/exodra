import type { TExoTermElement } from '../instance/types/TExoTermElement';

// IT WALKS THROUGH REGIONS, which is the only reason it is a function and not two lines at the call
// site: a region's contents are `TExoTermChild`s whose elements hang off a `node` field, so a naive
// walk of `kids` steps over every list row in the tree. There is no selector language.
export function exoTermFind(root: TExoTermElement, tag: string): TExoTermElement | null {
    if (root.tag === tag) return root;
    const kids = root.kids;
    for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if ('tag' in kid) {
            const found = exoTermFind(kid, tag);
            if (found !== null) return found;
            continue;
        }
        if ('text' in kid) continue;
        const children = kid.children;
        for (let j = 0; j < children.length; j++) {
            const found = exoTermFind(children[j].node, tag);
            if (found !== null) return found;
        }
    }
    return null;
}
