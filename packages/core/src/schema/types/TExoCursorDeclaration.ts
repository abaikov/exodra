import type { TExoSchemaBuild } from './TExoSchemaBuild';
import type { TExoAnyPort } from '../ports/types/TExoAnyPort';
import type { TExoJsonDeclarations } from './TExoJsonDeclarations';

export type TExoCursorDeclaration<TPorts = unknown> = {
    readonly rootTag: string;
    readonly ports: TPorts;
    readonly portList: TExoAnyPort[];
    readonly build: TExoSchemaBuild;
    readonly declaredPorts: number;
    readonly jsonDeclarations: TExoJsonDeclarations | null;
};
