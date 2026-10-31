import type { TExoDomSetter } from '../types/TExoDomSetter';

export const writeExoProperty: TExoDomSetter = (node, value, data) => {
    (node as unknown as Record<string, unknown>)[data as string] = value;
};
