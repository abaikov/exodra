// No `@types/jsdom` is installed; this is the part of it the bench loader reaches.
declare module 'jsdom' {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- jsdom's own export name
    export class JSDOM {
        constructor(html?: string);
        readonly window: { document: Document };
    }
}
