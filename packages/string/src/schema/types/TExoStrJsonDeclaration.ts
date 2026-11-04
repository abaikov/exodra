import type { TExoStrWriterDeclaration } from './TExoStrWriterDeclaration';

export type TExoStrJsonDeclaration = {
    readonly pieces: readonly string[];
    readonly order: readonly number[] | null;
    readonly writers: readonly TExoStrWriterDeclaration[];
};
