import { EXO_RAW_TEXT_ELEMENTS } from '../constants/EXO_RAW_TEXT_ELEMENTS';
import { EXO_RCDATA_ELEMENTS } from '../constants/EXO_RCDATA_ELEMENTS';

/**
 * Inside a raw-text or RCDATA element everything up to the closing sequence is characters, so no
 * markup a server prints will be parsed back into an element. It reads BOTH tag lists because the
 * question is the content model, which they share — not escaping, which they do not.
 */
export function assertExoNoElementInRawText(parent: string, tag: string, declaredBy: string): void {
    const lower = parent.toLowerCase();
    const raw = EXO_RAW_TEXT_ELEMENTS.has(lower);
    if (!raw && !EXO_RCDATA_ELEMENTS.has(lower)) return;

    // EXO0004, payload: the child tag then the parent tag, in the order the registry row promises.
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: <${tag}> is declared inside <${lower}>, and <${lower}> is a ` +
              `${raw ? 'RAW TEXT' : 'RCDATA'} element — no TAG is recognised between its tags, ` +
              `so <${tag}> would be CHARACTERS there and not an element` +
              `. The server would print <${lower}><${tag}></${tag}></${lower}> and a browser ` +
              `reading those bytes builds a <${lower}> holding the TEXT "<${tag}></${tag}>", not ` +
              `a <${tag}> element. The markup this schema describes can never be re-parsed into ` +
              'the tree it declares, which is why the DOM backend — the side that parses its own ' +
              'output back — refuses it while the server prints it. ' +
              (raw
                  ? `Nothing inside <${lower}> is decoded either, so there is no spelling of a ` +
                    'tag that gets in. '
                  : `A character reference IS decoded inside <${lower}>, which is why its text ` +
                    'is escaped by both backends and why a text port is allowed in here — but a ' +
                    'reference decodes to a CHARACTER, never to a tag. ') +
              `If the <${tag}> is content, move it OUT of the <${lower}>. If it is meant to BE ` +
              `the text of the <${lower}>, declare it with text()` +
              (raw
                  ? ', which both backends emit verbatim, or give the element a children port of ' +
                    'its own (unsafeHtml) and own the boundary there.'
                  : ', which both backends escape identically.')
            : `EXO0004 "${tag}" "${lower}"`
    );
}
