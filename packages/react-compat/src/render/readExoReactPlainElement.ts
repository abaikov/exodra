import type { TExoReactElement } from '../types/TExoReactElement';

export function readExoReactPlainElement(element: TExoReactElement): TExoReactElement {
    const templated = element as TExoReactElement & {
        readonly values?: readonly unknown[];
        readonly source?: TExoReactElement;
    };
    return templated.values === undefined || templated.source === undefined
        ? element
        : templated.source;
}
