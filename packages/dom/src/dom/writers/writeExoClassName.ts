import type { TExoDomSetter } from '../types/TExoDomSetter';

export const writeExoClassName: TExoDomSetter = (node, value) => {
    (node as HTMLElement).className =
        value === null || value === undefined ? '' : (value as string);
};
