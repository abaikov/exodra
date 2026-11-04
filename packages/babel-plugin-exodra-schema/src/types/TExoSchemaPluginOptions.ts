export type TExoSchemaPluginOptions = {
    schemaSource?: string;
    schemaImport?: string;
    markerName?: string;
    // `false` emits the declaration alone and leaves the compile to the page's backends.
    jsonDeclarations?: boolean;
};
