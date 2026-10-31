import { EXO_FOSTERING_TEXT_PARENTS } from '../constants/EXO_FOSTERING_TEXT_PARENTS';

const WHITESPACE_ONLY = /^[\t\n\f\r ]*$/;

/**
 * A run of static text is foster-parented out of a table the same way an element is, and a run that
 * is only whitespace is not. Asked of the run the compiler is about to build a Text node from, so
 * the schema is refused before either backend prints it — see `assertExoParserStableChild` for
 * why this moved from a check on the parsed prototype to a check on the declaration, and for who
 * asks it now.
 */
export function assertExoParserStableText(parentTag: string, run: string): void {
    if (!EXO_FOSTERING_TEXT_PARENTS.has(parentTag)) return;
    if (WHITESPACE_ONLY.test(run)) return;
    const head =
        `createExoSchema: the HTML parser reshapes this schema's markup. Inside <${parentTag}> the ` +
        `schema declares the static text ${JSON.stringify(run.slice(0, 30))}, which is ` +
        'FOSTER-PARENTED out in front of the <table>.';
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? head +
              ' @exodra/string prints it where the schema puts it, so the served page has the ' +
              'text inside the table and a client render has it inside too — while a browser ' +
              'reading those bytes moves it out. Put the text in a <td>, <th> or <caption>.'
            : head
    );
}
