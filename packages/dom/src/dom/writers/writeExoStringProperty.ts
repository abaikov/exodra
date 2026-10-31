import type { TExoDomSetter } from '../types/TExoDomSetter';

export const writeExoStringProperty: TExoDomSetter = (node, value, data) => {
    (node as unknown as Record<string, unknown>)[data as string] = value ?? null;
};
