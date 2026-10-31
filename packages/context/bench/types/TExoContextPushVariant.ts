import type { TExoContextPushStream } from './TExoContextPushStream';

export type TExoContextPushVariant = {
    readonly name: string;
    readonly drive: (stream: TExoContextPushStream) => number;
    /** Builds ONE chain and reads every provided value back out of it, innermost token first. What
     * a design provides has to be what it can be asked for, or its read row is about nothing. */
    readonly verify: (stream: TExoContextPushStream) => readonly (string | undefined)[];
};
