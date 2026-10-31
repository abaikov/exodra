export type TExoMarkupNames = {
    value(port: string): string;
    handler(port: string): string | null;
    ref(port: string): string;
    readonly styleOf: string;
};
