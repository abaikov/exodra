import type { TExoCursorDeclaration } from '../types/TExoCursorDeclaration';

export function harvestExoSchema(schema: TExoCursorDeclaration): string {
    return schema.rootTag;
}
