import type { TExoDomSetter } from '../../../dom/types/TExoDomSetter';

// Node.TEXT_NODE, spelled out: reaching it through an instance is a property load per fill.
const TEXT_NODE = 3;

// It TAKES THE ELEMENT — by declaring nothing — and that is why it can act at all: the Text node can
// be replaced under us and the element cannot. WHEN THE `nodeType` TEST FAILS IT IS NOT A REPAIR: it
// assigns `textContent`, destroying everything inside the element, not merely a translator's wrapper.
// An empty value takes the Text node OUT, which is legal precisely because this writer declared
// nothing, so no node table is holding the node it detached.
export const exoReclaimingText: TExoDomSetter = (node, value) => {
    const str = value == null ? '' : String(value);
    const first = node.firstChild;
    if (str === '') {
        if (first !== null) node.textContent = '';
        return;
    }
    // `nextSibling` IS PART OF THE TEST: a third party that appended beside our Text node left the
    // element holding two things, and writing `.data` would keep whatever it put there.
    if (first !== null && first.nodeType === TEXT_NODE && first.nextSibling === null) {
        (first as Text).data = str;
        return;
    }
    node.textContent = str;
};
