/**
 * A region is anchored on the NEXT STATIC ELEMENT, so static text after a children port lands
 * before the rows on the server and after them in the browser. An EMPTY run is not a refusal: it
 * occupies no position and moves no anchor.
 */
export function assertExoNoTextAfterChildrenPort(tag: string, run: string): void {
    if (run.length === 0) return;

    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `createExoSchema: a children port inside <${tag}> is followed by the static text ` +
              JSON.stringify(run.slice(0, 30)) +
              '. A region is anchored on the next static ELEMENT, so its rows would land AFTER ' +
              'that text in the browser while the server prints them before it — the two ' +
              'backends would build different trees. Wrap the text in an element, or make it ' +
              'part of what the wiring puts in the region.'
            : 'EXO0014'
    );
}
