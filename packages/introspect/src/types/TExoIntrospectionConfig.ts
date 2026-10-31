export interface TExoIntrospectionConfig {
    projectRoot: string;
    tsconfigPath?: string;
    include?: string[];
    exclude?: string[];
    analysis?: {
        schema?: boolean;
        performance?: boolean;
    };
}
