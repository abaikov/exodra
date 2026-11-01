import type { TExoReactRange } from '../types/TExoReactRange';
import type { TExoReactSlot } from '../types/TExoReactSlot';

export function createExoReactSlot(
    range: TExoReactRange,
    kind: TExoReactSlot['kind'],
    type: unknown,
    key: string,
    props: unknown,
    ref: unknown
): TExoReactSlot {
    const component = range.component;
    return {
        kind,
        type,
        key,
        props,
        ref,
        node: null,
        text: null,
        range: null,
        parentRange: range,
        parentComponent: component,
        depth: component === null ? 1 : component.depth + 1,
        hooks: [],
        consumers: null,
        dirty: false,
        alive: true,
        pass: 0,
    };
}
