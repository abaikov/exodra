import type { TExoBaseNodeFields } from '../wiring/types/TExoBaseNodeFields';

export function swapExoParams<TParams>(
    node: Pick<TExoBaseNodeFields, 'serviceState'>,
    params: TParams
): TParams | undefined {
    const previous = node.serviceState as TParams | undefined;
    node.serviceState = params;
    return previous;
}
