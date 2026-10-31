import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import { exoReactTagMachine } from './render/exoReactTagMachine';
import type { TExoReactElement } from './types/TExoReactElement';

export function createElement(
    type: unknown,
    config?: Readonly<Record<string, unknown>> | null,
    ...children: unknown[]
): TExoReactElement {
    const props: Record<string, unknown> = {};
    let key: string | null = null;
    let ref: unknown = null;
    if (config !== null && config !== undefined) {
        for (const name in config) {
            if (name === 'key') key = config.key === undefined ? null : String(config.key);
            else if (name === 'ref') ref = config.ref;
            else props[name] = config[name];
        }
    }
    if (children.length === 1) props.children = children[0];
    else if (children.length > 1) props.children = children;
    const defaults = (type as { defaultProps?: Record<string, unknown> } | null)?.defaultProps;
    if (defaults !== undefined && defaults !== null) {
        for (const name in defaults) if (props[name] === undefined) props[name] = defaults[name];
    }
    return {
        $$typeof: EXO_REACT_SYMBOLS.element,
        type,
        props,
        key,
        ref,
        host: typeof type === 'string' ? exoReactTagMachine(type) : null,
    };
}
