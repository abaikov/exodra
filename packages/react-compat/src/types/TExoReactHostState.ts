import type { TExoReactRange } from './TExoReactRange';

export type TExoReactHostState = {
    readonly element: Element;
    readonly regions: TExoReactRange[];
    readonly parts: TExoReactHostState[];
    readonly handlers: (((event: Event) => void) | null | undefined)[];
    readonly last: unknown[];
    props: Readonly<Record<string, unknown>>;
    listeners: Record<string, unknown> | null;
    ref: unknown;
};
