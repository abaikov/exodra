import { EXO_RAW_TEXT_ELEMENTS } from '../constants/EXO_RAW_TEXT_ELEMENTS';
import { EXO_RCDATA_ELEMENTS } from '../constants/EXO_RCDATA_ELEMENTS';

/**
 * `set`/`bind` on a shared port already throw on both backends; the INSTANCE fillers do not, and
 * they diverge. Refusing the shape also removes the boundary a static and a port could spell a
 * closing sequence across. One hole is left, and it is named in the README, "The RCDATA hole".
 */
export function assertExoSoleChildRawTextPort(
    tag: string,
    siblings: number,
    declaredBy: string
): void {
    const lower = tag.toLowerCase();
    const raw = EXO_RAW_TEXT_ELEMENTS.has(lower);
    if (!raw && !EXO_RCDATA_ELEMENTS.has(lower)) return;
    if (siblings === 0) return;

    // EXO0005, payload: the element tag then the sibling count, in that order.
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: <${lower}> is a ${raw ? 'RAW TEXT' : 'RCDATA'} element, and a ` +
              `children port inside one must be its ONLY child — this one already has ` +
              `${siblings} sibling(s) declared before it` +
              '. A port that shares its element cannot be filled with raw markup on either ' +
              'backend — the browser writes markup with innerHTML, which takes the whole element ' +
              'and would destroy the siblings, so the server refuses it too rather than rendering ' +
              'a page that throws in a browser. What is left is a nested instance, and an ' +
              `instance inside <${lower}> is printed as MARKUP by the server, where no parser ` +
              'will read it back as an element, while the browser inserts real element nodes: one ' +
              'schema, two pages. ' +
              (raw
                  ? 'A static in front of the port is also how a closing sequence gets spelled ' +
                    `across the two — "</scr" here and "ipt>" arriving in the value would end the ` +
                    `<${lower}> on the served page. `
                  : `Text is ESCAPED in a <${lower}>, so nothing a static or a value spells can ` +
                    'end the element — the divergence above is the whole of it. ') +
              (raw
                  ? `Give the raw content a port that is the element's only child (the ` +
                    'unsafeHtml hatch) and put the static text INSIDE the value, '
                  : `A <${lower}> holds TEXT, so the port you want is usually textPort(), which ` +
                    'is allowed in here and escaped by both backends, ') +
              `or move the nested instance OUT of the <${lower}> entirely.`
            : `EXO0005 "${lower}" ${siblings}`
    );
}
