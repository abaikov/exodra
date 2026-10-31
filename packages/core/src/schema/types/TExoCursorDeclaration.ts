import type { TExoSchemaBuild } from './TExoSchemaBuild';
import type { TExoAnyPort } from '../ports/types/TExoAnyPort';

export type TExoCursorDeclaration<TPorts = unknown> = {
    readonly rootTag: string;
    readonly ports: TPorts;
    readonly portList: TExoAnyPort[];
    readonly build: TExoSchemaBuild;
    readonly declaredPorts: number;
};
