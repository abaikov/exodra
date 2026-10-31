import { EXO_STATE_SCRIPT_ID } from '../constants/EXO_STATE_SCRIPT_ID';

// No DOM touched at module scope and the package is `sideEffects: false`, so a server bundle drops
// this. No unescaping step, and that is not an omission: `renderExoJsonScript` writes `<`, `>`,
// `&`, U+2028 and U+2029 as `\uXXXX` — JSON string escapes, so `JSON.parse` returns the originals.
// `undefined` means "no script"; a script that IS there and does not parse throws.
export function readExoStateScript(
    // The writer's default, shared not repeated: an id nobody wrote reads as "no state".
    id = EXO_STATE_SCRIPT_ID,
    doc: Document = document
): Record<string, unknown> | undefined {
    const element = doc.getElementById(id);
    if (element === null) return undefined;
    const text = element.textContent;
    // An element with no text is the same fact as no element.
    if (text === null || text === '') return undefined;
    return JSON.parse(text) as Record<string, unknown>;
}
