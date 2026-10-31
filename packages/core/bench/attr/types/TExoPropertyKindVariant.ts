import type { TExoPropertyKindStream } from './TExoPropertyKindStream';

/** One candidate implementation of `exoDomPropertyKind`, with the loop that drives it. */
export type TExoPropertyKindVariant = {
    readonly name: string;
    readonly answer: (tag: string, attr: string) => boolean | undefined;
    readonly drive: (stream: TExoPropertyKindStream) => number;
};
