import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import { exoReactTagMachine } from './render/exoReactTagMachine';
import type { TExoReactElement } from './types/TExoReactElement';

export function jsx(
    type: unknown,
    props: Readonly<Record<string, unknown>>,
    key?: unknown
): TExoReactElement {
    let own: Readonly<Record<string, unknown>> = props;
    let ref: unknown = null;
    if ('ref' in props || 'key' in props) {
        const copy: Record<string, unknown> = {};
        for (const name in props) {
            if (name === 'ref') ref = props.ref;
            else if (name === 'key') key = key === undefined ? props.key : key;
            else copy[name] = props[name];
        }
        own = copy;
    }
    const defaults = (type as { defaultProps?: Record<string, unknown> } | null)?.defaultProps;
    if (defaults !== undefined && defaults !== null) {
        const filled: Record<string, unknown> = { ...own };
        for (const name in defaults) if (filled[name] === undefined) filled[name] = defaults[name];
        own = filled;
    }
    return {
        $$typeof: EXO_REACT_SYMBOLS.element,
        type,
        props: own,
        key: key === undefined || key === null ? null : String(key),
        ref,
        host: typeof type === 'string' ? exoReactTagMachine(type) : null,
    };
}
