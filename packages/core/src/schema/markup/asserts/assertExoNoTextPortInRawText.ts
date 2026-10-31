import { EXO_RAW_TEXT_ELEMENTS } from '../constants/EXO_RAW_TEXT_ELEMENTS';

/**
 * The HTML serialiser does not escape a Text node whose parent is one of these, so the server's
 * escaped bytes reach the script's source as `&lt;` — and writing it raw instead is a server-only
 * injection, because nothing escapes `</script`. Raw content goes through an owning children port.
 */
export function assertExoNoTextPortInRawText(tag: string, declaredBy: string): void {
    if (!EXO_RAW_TEXT_ELEMENTS.has(tag.toLowerCase())) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: <${tag}> is a RAW TEXT element, and a text port inside one cannot be ` +
              'written the same way by both backends' +
              ' — the server escapes a text value and the ' +
              'HTML serialiser does not escape text in these elements, so the two would print ' +
              `different bytes, and the escaped one is broken anyway, since <${tag}> decodes no ` +
              'character references: `&lt;` reaches the source as those four characters. Writing ' +
              'it raw instead is not a fix either: nothing can escape the closing sequence, so a ' +
              `value containing "</${tag}" would end the element and ship markup of its own. If ` +
              'the content is genuinely raw, give the element a children port of its own ' +
              '(unsafeHtml) and own the escaping there.'
            : 'EXO0012'
    );
}
