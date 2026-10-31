import type { TExoControlValue } from './TExoControlValue';

export type TExoControlRule = (
    value: TExoControlValue | undefined,
    values: readonly (TExoControlValue | undefined)[]
) => string | null;
