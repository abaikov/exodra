import type { TExoReactHostState } from '../types/TExoReactHostState';
import type { TExoReactRange } from '../types/TExoReactRange';

const NO_PROPS: Readonly<Record<string, unknown>> = {};

export function createExoReactHostState(
    element: Element,
    regions: TExoReactRange[],
    parts: TExoReactHostState[],
    handlerCount: number
): TExoReactHostState {
    return {
        element,
        regions,
        parts,
        handlers: handlerCount === 0 ? [] : new Array(handlerCount).fill(null),
        last: [],
        props: NO_PROPS,
        listeners: null,
        ref: null,
    };
}
