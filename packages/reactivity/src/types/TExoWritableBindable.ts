import type { TExoBindable } from './TExoBindable';

export type TExoWritableBindable<
    TValue = unknown,
    TEvent = TValue
> = TExoBindable<TValue, TEvent> & {
    setValue(value: TValue, event?: TEvent): void;
};
