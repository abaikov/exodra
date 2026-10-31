import { EXO_REACT_SYMBOLS } from '../constants/EXO_REACT_SYMBOLS';
import type { TExoReactElement } from '../types/TExoReactElement';
import type { TExoReactHostTemplateNode } from '../types/TExoReactHostTemplateNode';

function hasProps(
    node: TExoReactHostTemplateNode,
    props: Readonly<Record<string, unknown>>
): boolean {
    const names = node.props;
    let at = 0;
    let inOrder = true;
    for (const name in props) {
        if (name === 'children') continue;
        if (at >= names.length) return false;
        if (inOrder && names[at] !== name) inOrder = false;
        if (!inOrder && !names.includes(name)) return false;
        at++;
    }
    return true;
}

export function collectExoReactHostTemplateValues(
    node: TExoReactHostTemplateNode,
    element: TExoReactElement,
    values: unknown[]
): boolean {
    const props = element.props;
    if ((props.dangerouslySetInnerHTML !== undefined) !== node.html) return false;
    if (element.ref !== null && !node.ref) return false;
    if (!hasProps(node, props)) return false;
    const names = node.props;
    for (let i = 0; i < names.length; i++) values.push(props[names[i]]);
    if (node.ref) values.push(element.ref);
    if (node.html) return true;
    const children = props.children;
    if (node.wholeRegion) {
        values.push(children);
        return true;
    }
    const kinds = node.kinds;
    const list = Array.isArray(children);
    const count = children === undefined ? 0 : list ? (children as unknown[]).length : 1;
    if (count !== kinds.length) return false;
    for (let i = 0; i < count; ) {
        const kid = list ? (children as unknown[])[i] : children;
        const kind = kinds[i];
        if (kind === 'host') {
            const nested = node.nested[i] as TExoReactHostTemplateNode;
            const host = kid as (TExoReactElement & { readonly values?: unknown }) | null;
            if (
                typeof host !== 'object' ||
                host === null ||
                host.$$typeof !== EXO_REACT_SYMBOLS.element ||
                host.type !== nested.tag ||
                host.key !== nested.key ||
                host.values !== undefined ||
                !collectExoReactHostTemplateValues(nested, host, values)
            ) {
                return false;
            }
            i++;
        } else if (kind === 'text') {
            const type = typeof kid;
            if (type !== 'string' && type !== 'number') return false;
            values.push(kid);
            i++;
        } else {
            const end = node.runEnd[i];
            values.push(end === i + 1 ? kid : (children as unknown[]).slice(i, end));
            i = end;
        }
    }
    return true;
}
