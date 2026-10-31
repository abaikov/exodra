import { EXO_FOREIGN_BREAKOUT_TAGS } from '../constants/EXO_FOREIGN_BREAKOUT_TAGS';
import { EXO_P_CLOSING_TAGS } from '../constants/EXO_P_CLOSING_TAGS';
import { EXO_SELECT_CONTENT } from '../constants/EXO_SELECT_CONTENT';
import { EXO_SELF_CLOSING_PARENTS } from '../constants/EXO_SELF_CLOSING_PARENTS';
import { EXO_TABLE_CONTENT } from '../constants/EXO_TABLE_CONTENT';
import { EXO_TABLE_IMPLIED_SECTION } from '../constants/EXO_TABLE_IMPLIED_SECTION';
import { EXO_TABLE_SECTIONING_TAGS } from '../constants/EXO_TABLE_SECTIONING_TAGS';
import { EXO_UNBUILDABLE_TAGS } from '../constants/EXO_UNBUILDABLE_TAGS';

/**
 * May this element stand inside that one, given the markup `@exodra/string` prints for the pair?
 *
 * WHAT IT REPLACED AND WHY IT IS A DIFFERENT KIND OF CHECK. `compileExoDomSchema` used to build
 * its prototype by parsing its own markup and then compare the result against the schema
 * (`assertExoUnreshapedMarkup`), so the parser named the defect and this file's tables did not have
 * to exist. The prototype is built directly now, and a direct build cannot be reshaped — the
 * divergence moved to the SERVER's bytes, which a browser still parses under these rules. So the
 * question is no longer "what did the parser do to us" but "what would it do to the page we print".
 *
 * WHO ASKS IT. A client-only render parses nothing and does not ask. The hydration pack supplies it
 * as `parserStability` on the composed backend, so a page that adopts a parser's output is refused
 * before its first instance, and a client-only bundle links neither this file nor its tables.
 *
 * `parentTag` is `null` for the schema's root, which has no parent to be reshaped by and can still
 * name a tag no parser builds. Both names are LOWERCASE.
 */
export function assertExoParserStableChild(
    parentTag: string | null,
    childTag: string,
    childInHtml: boolean
): void {
    if (!childInHtml) {
        if (EXO_FOREIGN_BREAKOUT_TAGS.has(childTag)) throw brokeOut(parentTag, childTag);
        return;
    }

    if (EXO_UNBUILDABLE_TAGS.has(childTag)) throw unbuildable(childTag);
    if (parentTag === null) return;

    const tableContent = EXO_TABLE_CONTENT.get(parentTag);
    if (tableContent !== undefined && !tableContent.has(childTag)) {
        const implied =
            parentTag === 'table'
                ? EXO_TABLE_IMPLIED_SECTION.get(childTag)
                : childTag === 'td' || childTag === 'th'
                ? 'tr'
                : undefined;
        if (implied !== undefined) throw impliedSection(parentTag, childTag, implied);
        throw fostered(parentTag, childTag);
    }

    if (
        (parentTag === 'td' || parentTag === 'th' || parentTag === 'caption') &&
        EXO_TABLE_SECTIONING_TAGS.has(childTag)
    ) {
        throw closesParent(parentTag, childTag);
    }

    if (parentTag === 'p' && EXO_P_CLOSING_TAGS.has(childTag))
        throw closesParent(parentTag, childTag);

    if (parentTag === 'select' && !EXO_SELECT_CONTENT.has(childTag)) {
        throw fromSelect(childTag);
    }

    const closers = EXO_SELF_CLOSING_PARENTS.get(parentTag);
    if (closers !== undefined && closers.has(childTag)) throw closesParent(parentTag, childTag);
}

// Every head is computed from the two tag names, so it stays outside the NODE_ENV guard and a
// production build still says which pair of elements was refused. Only the prose folds away.
function reshaped(head: string, why: string): Error {
    return new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? head +
              ' ' +
              why +
              ' @exodra/string prints the schema as written and a browser applies the parser to ' +
              'those bytes, so the served page and a client render would be DIFFERENT TREES from ' +
              'one schema — and hydration would adopt the wrong nodes silently, since the markup ' +
              'itself still looks right. Declare the shape the parser produces, where BOTH ' +
              'backends see it.'
            : head
    );
}

function impliedSection(parentTag: string, childTag: string, section: string): Error {
    return reshaped(
        `createExoSchema: the HTML parser reshapes this schema's markup. Inside <${parentTag}> the ` +
            `schema declares <${childTag}>, and the parser inserts a <${section}> around it. ` +
            `Write the <${section}> explicitly: <table> → <tbody> → <tr> → <td>.`,
        'The parser inserts the section whether it is written or not.'
    );
}

function fostered(parentTag: string, childTag: string): Error {
    return reshaped(
        `createExoSchema: the HTML parser reshapes this schema's markup. Inside <${parentTag}> the ` +
            `schema declares <${childTag}>, which is not table content and is FOSTER-PARENTED out ` +
            'in front of the <table>.',
        'Put it outside the table, or inside a <td>, <th> or <caption> where content belongs.'
    );
}

function closesParent(parentTag: string, childTag: string): Error {
    return reshaped(
        `createExoSchema: the HTML parser reshapes this schema's markup. Inside <${parentTag}> the ` +
            `schema declares <${childTag}>, and that start tag CLOSES the <${parentTag}> — the ` +
            'child comes back as its SIBLING.',
        `Close the <${parentTag}> yourself and put the two side by side, or wrap the child in an ` +
            'element that may hold it.'
    );
}

function fromSelect(childTag: string): Error {
    return reshaped(
        `createExoSchema: the HTML parser reshapes this schema's markup. Inside <select> the ` +
            `schema declares <${childTag}>, which a parser drops.`,
        'A <select> holds <option>, <optgroup> and <hr> and nothing else.'
    );
}

function unbuildable(childTag: string): Error {
    return reshaped(
        `createExoSchema: the HTML parser builds no <${childTag}> from this schema's markup.`,
        childTag === 'image'
            ? 'An <image> start tag in HTML content is rewritten to <img>, so the served page ' +
                  'carries an <img> and a client render would carry an element by another name. ' +
                  'Write <img>. (Inside an <svg>, <image> is the real SVG element and is fine.)'
            : 'The document structure is built once, before any component renders, and a second ' +
                  'start tag for it only merges attributes onto what is already there.'
    );
}

function brokeOut(parentTag: string | null, childTag: string): Error {
    const head =
        `createExoSchema: <${childTag}> is HTML inside SVG content, and it breaks OUT of the SVG` +
        (parentTag === null ? '.' : ` it is declared in (<${parentTag}>).`);
    return new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? head +
              ' The HTML parser closes foreign content the moment it meets a tag it knows (<div>,' +
              ' <p>, <table>, <span> and others), so the element becomes a SIBLING of the <svg> ' +
              'in the page the server sends. Put the HTML inside a <foreignObject>, which is the ' +
              'one element that may hold it.'
            : 'EXO0040'
    );
}
