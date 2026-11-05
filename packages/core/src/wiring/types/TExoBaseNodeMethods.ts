import type { TExoContextToken } from '@exodra/context';
import type { TExoEffectOwner } from './TExoEffectOwner';
import type { TExoFillDoors } from '../../schema/types/TExoFillDoors';
import type { TExoMachineEffect } from '../../machine/types/TExoMachineEffect';

export interface TExoBaseNodeMethods {
    fillDoors(): TExoFillDoors;
    onTeardown(off: () => void): void;
    provide<TValue>(key: TExoContextToken<TValue>, value: NoInfer<TValue>): void;
    inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined;
    readState<TValue>(): TValue;
    restartEffect<TOf extends TExoEffectOwner>(this: TOf, effect: TExoMachineEffect<TOf>): void;
    stopEffect<TOf extends TExoEffectOwner>(this: TOf, effect: TExoMachineEffect<TOf>): void;
    stopEffects(this: TExoEffectOwner): void;
    wireExoSelf(params?: unknown): void;
}
