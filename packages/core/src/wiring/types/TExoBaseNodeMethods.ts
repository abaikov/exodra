import type { TExoContextToken } from '@exodra/context';
import type { TExoEffectOwner } from './TExoEffectOwner';
import type { TExoFillDoors } from '../../schema/types/TExoFillDoors';
import type { TExoMachineEffect } from '../../machine/types/TExoMachineEffect';
import type { TExoMachineStateHandle } from '../../machine/types/TExoMachineStateHandle';

export interface TExoBaseNodeMethods {
    fillDoors(): TExoFillDoors;
    onTeardown(off: () => void): void;
    provide<TValue>(key: TExoContextToken<TValue>, value: TValue): void;
    inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined;
    readState<TValue>(handle?: TExoMachineStateHandle<TValue>): TValue;
    restartEffect<TOf extends TExoEffectOwner>(this: TOf, effect: TExoMachineEffect<TOf>): void;
    stopEffect<TOf extends TExoEffectOwner>(this: TOf, effect: TExoMachineEffect<TOf>): void;
    stopEffects(this: TExoEffectOwner): void;
}
