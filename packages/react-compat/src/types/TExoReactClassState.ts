import type { TExoReactSlot } from './TExoReactSlot';

export type TExoReactClassState = {
    slot: TExoReactSlot | null;
    pending: unknown[];
    callbacks: (() => void)[];
    forced: boolean;
    mounted: boolean;
};
