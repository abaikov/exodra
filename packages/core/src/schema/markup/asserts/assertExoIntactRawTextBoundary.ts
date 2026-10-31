import { EXO_RAW_TEXT_ELEMENTS } from '../constants/EXO_RAW_TEXT_ELEMENTS';
import { EXO_TAG_NAME_TERMINATORS } from '../constants/EXO_TAG_NAME_TERMINATORS';
import { exoDoubleEscapeArmedAt } from './exoDoubleEscapeArmedAt';

/**
 * A match at the very END of the run is not a match, and that rests on refusals in
 * `assertExoNoElementInRawText`, `assertExoNoTextPortInRawText` and `assertExoSoleChildRawTextPort`. If any of the
 * three is relaxed to allow a value beside a static here, `end === hay.length` comes back with it.
 */
function closingSequenceAt(tag: string, text: string): number {
    const needle = '</' + tag;
    const hay = text.toLowerCase();
    let at = hay.indexOf(needle);
    while (at >= 0) {
        // `charCodeAt` past the end returns `NaN`, which is in no set — so a run-ending match falls
        // through as the non-terminator it is, with no bounds branch.
        if (EXO_TAG_NAME_TERMINATORS.has(hay.charCodeAt(at + needle.length))) return at;
        at = hay.indexOf(needle, at + 1);
    }
    return -1;
}
/**
 * Raw text has NO escape mechanism, so escaping cannot hold the boundary: a static carrying the
 * closing sequence ends the element where it stands. Asked of the whole ADJACENT RUN, because both
 * compilers merge adjacent static text before emitting it.
 */
export function assertExoIntactRawTextBoundary(
    tag: string,
    adjacentRun: string,
    value: string,
    declaredBy: string
): void {
    const lower = tag.toLowerCase();
    if (!EXO_RAW_TEXT_ELEMENTS.has(lower)) return;

    const run = adjacentRun + value;

    const at = closingSequenceAt(lower, run);

    const inert = at >= 0 && lower === 'script' && exoDoubleEscapeArmedAt(run.slice(0, at)) >= 0;

    if (at >= 0 && !inert) {
        const found = JSON.stringify(run.slice(at, at + lower.length + 3));

        if (lower === 'plaintext') {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${declaredBy}: the static text inside <plaintext> contains ${found} at offset ` +
                      `${at} of ${JSON.stringify(
                          run.slice(0, 40)
                      )} — and NOTHING closes a <plaintext>: ` +
                      'it is the one element on the RAW TEXT list that runs to the END OF THE FILE' +
                      '. So those characters are text, and so is the </plaintext> the compiler ' +
                      'writes after them. It is refused because the string is the one place an ' +
                      'author says out loud that they expect the element to close, and it does ' +
                      'not: EVERY <plaintext> in a schema already prints bytes that no parser ' +
                      'reads back as the tree that produced them, since the whole rest of the ' +
                      "document becomes this element's text. Use <pre>, whose text both " +
                      'backends escape and which ends where it is written.'
                    : 'EXO0008'
            );
        }

        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${declaredBy}: the static text inside <${lower}> — a RAW TEXT element — contains ` +
                  `the closing sequence ${found} of that element, at offset ${at} of ` +
                  JSON.stringify(run.slice(0, 40)) +
                  ' — its text is written LITERALLY by both backends, because a character ' +
                  'reference in there reaches the source as its own characters, and HTML gives ' +
                  'raw text no escape mechanism at all. So this text ends the element where it ' +
                  'stands, and the rest of the schema is parsed as markup after it. Break the ' +
                  `sequence across the expression that produces it (\`'<' + '/${lower}>'\`), or ` +
                  'give the element a children port of its own (unsafeHtml) and own the ' +
                  'boundary there.'
                : 'EXO0009'
        );
    }

    // The double-escape states exist in script data alone; asking in RAWTEXT would refuse working
    // programs to prevent nothing.
    if (lower !== 'script') return;

    const armed = exoDoubleEscapeArmedAt(run);
    if (armed < 0) {
        if (at < 0) return;

        // A DELIBERATE FALSE REFUSAL: `var t = "<!--<script>x</script>-->"` works. Accepting it would
        // rest the element boundary on this file's tokenizer rather than on a string.
        const found = JSON.stringify(run.slice(at, at + lower.length + 3));
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${declaredBy}: the static text inside <script> — a RAW TEXT element — contains the ` +
                  `closing sequence ${found} at offset ${at} of ` +
                  JSON.stringify(run.slice(0, 40)) +
                  ', where an earlier unclosed "<!--<script" has already put the tokenizer into the ' +
                  'SCRIPT DATA DOUBLE ESCAPED state — so that sequence closes NOTHING, and this is a ' +
                  'CONSERVATIVE refusal of a run that works as written' +
                  '. It is kept because accepting a </script> inside a <script> would rest the ' +
                  "whole boundary on this file's own tokenizer, which is a far larger claim than " +
                  'refusing one string. Break the CLOSING sequence to get past it ' +
                  "(`'<' + '/script>'`) — and not the \"<script\" instead, which would leave that " +
                  'same </script> in the merely ESCAPED state, where it really does end the ' +
                  'element.'
                : 'EXO0010'
        );
    }

    const armedFound = JSON.stringify(run.slice(armed, armed + 8));
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: the static text inside <script> — a RAW TEXT element — enters the ` +
              `tokenizer's SCRIPT DATA DOUBLE ESCAPED state on ${armedFound} at offset ${armed} of ` +
              JSON.stringify(run.slice(0, 40)) +
              ', and the run ENDS inside that state' +
              ' — an unclosed "<!--" earlier in this text put the tokenizer into script data ' +
              'ESCAPED, where a following "<script" plus a space, "/" or ">" arms the DOUBLE ' +
              'escaped state. In that state "</script" does not emit an end tag at all: it only ' +
              'walks back one level. So the end tag the compiler writes after this text closes ' +
              'nothing, and every byte of the document after it is consumed as JavaScript ' +
              'source — a whole-page takeover from a run that contains no closing sequence. ' +
              'Close the comment before the end of the text ("-->"), or break the "<script" so ' +
              'the tokenizer never sees it ("<" + "script", or "\\x3Cscript" in a JavaScript ' +
              'string), or give the element ' +
              'a children port of its own (unsafeHtml) and own the boundary there.'
            : 'EXO0011'
    );
}
