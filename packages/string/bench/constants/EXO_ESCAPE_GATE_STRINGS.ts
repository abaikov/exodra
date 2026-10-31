// WRITTEN AS A CODE POINT AND NOT AS A LITERAL: U+00A0 is indistinguishable from a space in every
// editor and every diff, and it is one of the four characters the escaper acts on.
const NBSP = String.fromCharCode(0x00a0);
const NUL = String.fromCharCode(0x0000);
const DEL = String.fromCharCode(0x007f);

/**
 * NOTHING IS TIMED UNTIL EVERY VARIANT ANSWERS WHAT THE SHIPPED ESCAPER ANSWERS, CHARACTER FOR
 * CHARACTER. The awkward entries are deliberate: an already-escaped entity is where a single-pass
 * scanner and a chain of replacements can disagree about the ampersand, a lone surrogate is where a
 * code-unit scan can split a pair, and a run of escapables at index 0 and at the last index is
 * where a slice-flushing scanner drops a piece.
 */
export const EXO_ESCAPE_GATE_STRINGS: readonly string[] = [
    '',
    'a',
    '&',
    '<',
    '>',
    '"',
    ' ',
    NBSP,
    '&&&&',
    '<<<<',
    '""""',
    NBSP + NBSP + NBSP,
    '&amp;',
    '&#x26;',
    '&lt;script&gt;',
    '<script>alert(1)</script>',
    'Tom & Jerry',
    'a&b<c>d"e f',
    NBSP + 'leading nbsp',
    'trailing nbsp' + NBSP,
    '&leading amp',
    'trailing amp&',
    '<leading lt',
    'trailing gt>',
    '"leading quote',
    'trailing quote"',
    'plain text with no escapable character at all',
    'emoji \u{1F600} and an ampersand &',
    '\uD83D lone high surrogate & after',
    '\uDE00 lone low surrogate < after',
    "apostrophe ' is deliberately left alone",
    'tab\tnewline\nreturn\r',
    'a'.repeat(400),
    'x&y<z>' + NBSP,
    ('x&y<z>' + NBSP).repeat(40),
    NUL + 'NUL and ' + DEL + 'DEL',
    'price 49,99' + NBSP + '€ & tax',
];
