import { EXO_TAG_NAME_TERMINATORS } from '../constants/EXO_TAG_NAME_TERMINATORS';
/*
 * Two spec state pairs are COLLAPSED: each either emits a real end tag — which `closingSequenceAt`
 * has already refused — or reconsumes where it came from. Exact only because that function ran first.
 */
const S_DATA = 0;
const S_DATA_LT = 1;
const S_ESCAPE_START = 2;
const S_ESCAPE_START_DASH = 3;
const S_ESCAPED = 4;
const S_ESCAPED_DASH = 5;
const S_ESCAPED_DASH_DASH = 6;
const S_ESCAPED_LT = 7;
const S_DOUBLE_START = 8;
const S_DOUBLE = 9;
const S_DOUBLE_DASH = 10;
const S_DOUBLE_DASH_DASH = 11;
const S_DOUBLE_LT = 12;
const S_DOUBLE_END = 13;
function isAlpha(c: number): boolean {
    return (c >= 97 && c <= 122) || (c >= 65 && c <= 90);
}
/**
 * Ending in `S_DOUBLE_START` is excluded BY NAME: the element's own `</script>` starts with `<`,
 * which drops the machine into escaped, where the sequence does close. Refusing it would be false.
 */
export function exoDoubleEscapeArmedAt(text: string): number {
    const s = text.toLowerCase();
    let state = S_DATA;
    let buf = '';
    let openedAt = -1;
    let armedAt = -1;
    let i = 0;
    while (i < s.length) {
        const c = s.charCodeAt(i);
        switch (state) {
            case S_DATA:
                if (c === 60) state = S_DATA_LT;
                i++;
                break;
            case S_DATA_LT:
                if (c === 33) {
                    state = S_ESCAPE_START;
                    i++;
                } else if (c === 47) {
                    state = S_DATA;
                    i++;
                } else {
                    state = S_DATA;
                }
                break;
            case S_ESCAPE_START:
                if (c === 45) {
                    state = S_ESCAPE_START_DASH;
                    i++;
                } else {
                    state = S_DATA;
                }
                break;
            case S_ESCAPE_START_DASH:
                if (c === 45) {
                    // `<!--` lands in escaped dash dash, which is why `<!-->` is already balanced.
                    state = S_ESCAPED_DASH_DASH;
                    i++;
                } else {
                    state = S_DATA;
                }
                break;
            case S_ESCAPED:
                if (c === 45) state = S_ESCAPED_DASH;
                else if (c === 60) {
                    state = S_ESCAPED_LT;
                    openedAt = i;
                }
                i++;
                break;
            case S_ESCAPED_DASH:
                if (c === 45) state = S_ESCAPED_DASH_DASH;
                else if (c === 60) {
                    state = S_ESCAPED_LT;
                    openedAt = i;
                } else state = S_ESCAPED;
                i++;
                break;
            case S_ESCAPED_DASH_DASH:
                if (c === 45) {
                    // DELIBERATELY NOTHING: the spec's script-data-escaped-dash-dash state stays
                    // where it is on another `-`, which is what keeps a run like `--->` armed for
                    // the `>` that ends it. Writing `state = S_ESCAPED_DASH_DASH` here would say
                    // the same thing and read as a transition that is not one.
                } else if (c === 60) {
                    state = S_ESCAPED_LT;
                    openedAt = i;
                } else if (c === 62) state = S_DATA;
                else state = S_ESCAPED;
                i++;
                break;
            case S_ESCAPED_LT:
                if (c === 47) {
                    state = S_ESCAPED;
                    i++;
                } else if (isAlpha(c)) {
                    state = S_DOUBLE_START;
                    buf = '';
                } else {
                    state = S_ESCAPED;
                }
                break;
            case S_DOUBLE_START:
                if (isAlpha(c)) {
                    buf += s[i];
                    i++;
                } else if (EXO_TAG_NAME_TERMINATORS.has(c)) {
                    if (buf === 'script') {
                        state = S_DOUBLE;
                        armedAt = openedAt;
                    } else state = S_ESCAPED;
                    i++;
                } else {
                    state = S_ESCAPED;
                }
                break;
            case S_DOUBLE:
                if (c === 45) state = S_DOUBLE_DASH;
                else if (c === 60) state = S_DOUBLE_LT;
                i++;
                break;
            case S_DOUBLE_DASH:
                if (c === 45) state = S_DOUBLE_DASH_DASH;
                else if (c === 60) state = S_DOUBLE_LT;
                else state = S_DOUBLE;
                i++;
                break;
            case S_DOUBLE_DASH_DASH:
                if (c === 45) {
                    // DELIBERATELY NOTHING, for the same reason as the escaped twin above: the
                    // script-data-double-escaped-dash-dash state holds on another `-`.
                } else if (c === 60) state = S_DOUBLE_LT;
                else if (c === 62) {
                    // `-->` from double escaped goes all the way back to script data, not to escaped. Leaving this
                    // transition out would refuse `"<!--<script>x-->"`, which works.
                    state = S_DATA;
                    armedAt = -1;
                } else state = S_DOUBLE;
                i++;
                break;
            case S_DOUBLE_LT:
                if (c === 47) {
                    state = S_DOUBLE_END;
                    buf = '';
                    i++;
                } else {
                    state = S_DOUBLE;
                }
                break;
            case S_DOUBLE_END:
                if (isAlpha(c)) {
                    buf += s[i];
                    i++;
                } else if (EXO_TAG_NAME_TERMINATORS.has(c)) {
                    if (buf === 'script') {
                        // One level out, and NO end tag token — the whole reason this file exists.
                        state = S_ESCAPED;
                        armedAt = -1;
                    } else state = S_DOUBLE;
                    i++;
                } else {
                    state = S_DOUBLE;
                }
                break;
        }
    }

    // `S_DOUBLE_START` is absent on purpose — see the header of this function.
    if (
        state === S_DOUBLE ||
        state === S_DOUBLE_DASH ||
        state === S_DOUBLE_DASH_DASH ||
        state === S_DOUBLE_LT ||
        state === S_DOUBLE_END
    ) {
        return armedAt;
    }
    return -1;
}
