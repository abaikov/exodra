import type { TExoDomSetter } from './TExoDomSetter';

export type TExoAttrWrite = {
    readonly write: TExoDomSetter;
    readonly data: unknown;
};
