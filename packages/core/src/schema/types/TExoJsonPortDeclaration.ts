import type { TExoAnyPort } from '../ports/types/TExoAnyPort';

export type TExoJsonPortDeclaration = {
    readonly kind: TExoAnyPort['kind'];
    readonly name: string | null;
};
