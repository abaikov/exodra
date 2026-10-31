import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import { exoReactTagMachine } from './render/exoReactTagMachine';
import type { TExoReactElement } from './types/TExoReactElement';
import type { TExoReactHostElement } from './types/TExoReactHostElement';

export function cloneElement(
    element: TExoReactElement,
    config?: Readonly<Record<string, unknown>> | null,
    ...children: unknown[]
): TExoReactElement {
    const props: Record<string, unknown> = { ...element.props };
    let key = element.key;
    let ref = 'values' in element ? (element as TExoReactHostElement).source.ref : element.ref;
    if (config !== null && config !== undefined) {
        for (const name in config) {
            if (name === 'key') key = config.key === undefined ? key : String(config.key);
            else if (name === 'ref') ref = config.ref;
            else props[name] = config[name];
        }
    }
    if (children.length === 1) props.children = children[0];
    else if (children.length > 1) props.children = children;
    return {
        $$typeof: EXO_REACT_SYMBOLS.element,
        type: element.type,
        props,
        key,
        ref,
        host: typeof element.type === 'string' ? exoReactTagMachine(element.type) : null,
    };
}
