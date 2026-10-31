import type { TExoContextToken } from '@exodra/context';

export type TExoReactIdOwner = {
    inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined;
};
