import type { TExoAnyPort } from '../../ports/types/TExoAnyPort';

export type TExoSchemaDraft = {
    named: Record<string, TExoAnyPort>;
    ports: TExoAnyPort[];
    next: number;
    open: boolean;
    describedRoots: string[];
    rootTag: string | null;
};
