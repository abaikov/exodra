import { exoDomPropertyKind } from '../../../attr/exoDomPropertyKind';

/**
 * Both compilers cut the markup exactly ONCE per port, in numbering order, so this port's writer can
 * only emit bytes at its own slot — reaching the `<option>`s from a `<select>`'s open tag is a
 * change to the wire format, not a fix to a writer. `<textarea>` and `indeterminate` are NOT
 * refused although they share the defect: see the README, "Refusals kept and refusals declined".
 */
export function assertExoServablePropertyPort(tag: string, name: string, declaredBy: string): void {
    if (name !== 'value') return;
    const lower = tag.toLowerCase();
    if (lower !== 'select' && lower !== 'output') return;
    // The shared table is asked rather than duplicated, so the day one of these pairs gains a content
    // attribute this refusal stops firing on its own.
    if (exoDomPropertyKind(lower, name) !== false) return;

    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: port(${JSON.stringify(name)}) on <${lower}> cannot be SERVED` +
              ' — ' +
              (lower === 'select'
                  ? 'the server can print no such attribute, so it prints nothing and serves ' +
                    'the FIRST option while the client render shows another — the wrong page ' +
                    'until the bundle arrives, and forever with JavaScript off. The markup that ' +
                    'says which option is chosen is `selected` on the OPTION: a different ' +
                    "element, later in the document than this port's own slot, which no writer " +
                    "standing in a <select>'s open tag can reach. Say it on the options instead " +
                    "— give each <option> a port('selected') and mark the chosen one " +
                    "(@exodra/forms: writeExoChoice, keyed by the options' values; " +
                    "readExoControlValue reads the select's change event for the other " +
                    'direction). That ' +
                    'works when the options are a list, which nothing written on the <select> ' +
                    'could.'
                  : "an <output>'s value IS its text content — HTML gives it no `value` content " +
                    'attribute anywhere — so the server can print nothing here and serves an ' +
                    'empty <output> where the client render shows the number. Write the text ' +
                    'instead: textPort() on the <output>. An <output> is not user-editable, so ' +
                    'its text is its value on both backends and nothing can drift.')
            : 'EXO0015'
    );
}
