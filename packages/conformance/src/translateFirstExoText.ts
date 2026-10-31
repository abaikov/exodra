const TEXT_NODE = 3;

// What a translator extension does to a page: the first Text node in document order is detached and
// re-hung inside a `<font>` the extension inserted. From that moment a renderer holding the Text
// node itself has nothing left to write into.
//
// A subject with no Text node means the rule is not testing what it thinks it is, so this throws
// rather than passing quietly.
export function translateFirstExoText(parent: Element): void {
    const walker = document.createTreeWalker(parent, 4 /* NodeFilter.SHOW_TEXT */);
    const found = walker.nextNode();
    if (found === null || found.nodeType !== TEXT_NODE) {
        throw new Error(
            'translateFirstExoText: this subject has no Text node to translate — the rule is ' +
                'not testing what it thinks it is testing'
        );
    }
    const wrapper = document.createElement('font');
    const owner = found.parentNode;
    if (owner === null) {
        throw new Error('translateFirstExoText: the Text node found has no parent');
    }
    owner.replaceChild(wrapper, found);
    wrapper.appendChild(found);
}
