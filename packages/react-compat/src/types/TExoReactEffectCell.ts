import type { TExoReactSlot } from './TExoReactSlot';

export type TExoReactEffectCell = {
    readonly effect: true;
    readonly slot: TExoReactSlot;
    deps: readonly unknown[] | undefined | null;
    cleanup: (() => void) | null;
};
