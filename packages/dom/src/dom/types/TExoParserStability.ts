/** The two refusals a backend that meets a PARSER needs and a client-only one does not: a tag pair
 * the parser moves, and a text run it foster-parents. Only the TYPE is named outside `hydrate/`. */
export type TExoParserStability = {
    readonly child: (parentTag: string | null, childTag: string, childInHtml: boolean) => void;
    readonly text: (parentTag: string, run: string) => void;
};
