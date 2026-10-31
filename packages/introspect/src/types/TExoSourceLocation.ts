export interface TExoSourceLocation {
    file: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
}
