import type { TExoContextFrame } from '@exodra/context';
import type { TExoTransitionOverrides } from '../../machine/types/TExoTransitionOverrides';

export type TExoBaseNodeFields = {
    context: TExoContextFrame | null;
    disposers: (() => void)[] | null;
    /**
     * `EXO_NO_STATE` until a declaration reserves a slot. SEATED BY EVERY NODE LITERAL rather than
     * stored afterwards: V8 sizes an object's in-object store from the literal it was built by.
     */
    state: unknown;
    managedState: unknown[];
    /** `null` for no effect AND for a torn-down instance, so a re-entrant disposer cannot re-arm it. */
    effectStops: ((() => void) | null)[] | null;
    transitionOverrides: TExoTransitionOverrides | null;
    serviceState: unknown;
    machine: unknown;
};
