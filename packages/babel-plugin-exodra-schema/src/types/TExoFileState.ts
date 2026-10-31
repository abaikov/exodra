export type TExoFileState = {
    schemas: number;
    compiled: boolean;
    /** Every name bound in the file, plus every local this compiler has reserved in it. */
    readonly taken: Set<string>;
    /** Import source → imported name → the local name standing for it. */
    readonly imports: Map<string, Map<string, string>>;
};
