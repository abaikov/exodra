export type TExoBenchDocument = {
    readonly document: Document;
    /** Printed beside every table: a fake DOM measures the fake, and the reader must be told. */
    readonly source: string;
};

/**
 * A real document if this module was loaded in a browser, otherwise jsdom — whose path is printed,
 * because this repository has two installed and two benches on different ones do not compare.
 */
export async function exoBenchDocument(): Promise<TExoBenchDocument> {
    const standing = (globalThis as { document?: Document }).document;
    if (standing !== undefined) {
        return { document: standing, source: 'REAL DOCUMENT — globalThis.document' };
    }
    const mod = await import('jsdom');
    const dom = new mod.JSDOM('<!doctype html><html><body></body></html>');
    const meta = import.meta as unknown as { resolve?: (specifier: string) => string };
    const where = meta.resolve === undefined ? '(path unknown)' : meta.resolve('jsdom');
    return {
        document: dom.window.document,
        source: `JSDOM — a fake DOM in JavaScript, NOT a browser; ${where}`,
    };
}
