import { exoContextFrame, readExoContext } from '@exodra/context';
import { exoVocabulary } from '../exoVocabulary';
import { stopExoEffects } from '../../machine/stopExoEffects';
import { wireExoNode } from '../../machine/wireExoNode';
import type { TExoNode } from '../../schema/types/TExoNode';
import { EXO_DISCONNECTED_EFFECT_STOPS } from '../../machine/constants/EXO_DISCONNECTED_EFFECT_STOPS';
import { EXO_STOPPED_EFFECT } from '../../machine/constants/EXO_STOPPED_EFFECT';
import type { TExoContextToken } from '@exodra/context';
import type { TExoMachineEffect } from '../../machine/types/TExoMachineEffect';
import type { TExoBaseNodeFields } from '../../wiring/types/TExoBaseNodeFields';
import type { TExoBaseNodeMethods } from '../../wiring/types/TExoBaseNodeMethods';
import type { TExoEffectOwner } from '../../wiring/types/TExoEffectOwner';
import type { TExoFillDoors } from '../../schema/types/TExoFillDoors';

type TExoBaseReceiver = TExoBaseNodeFields & TExoFillDoors;

const EXO_BASE_NODE_METHODS: TExoBaseNodeMethods & ThisType<TExoBaseReceiver> = {
    fillDoors(): TExoFillDoors {
        return this;
    },

    onTeardown(off: () => void): void {
        const disposers = this.disposers;
        if (disposers === null) this.disposers = [off];
        else disposers.push(off);
    },

    provide<TValue>(key: TExoContextToken<TValue>, value: NoInfer<TValue>): void {
        this.context = exoContextFrame(this.context, key, value);
    },

    inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined {
        return readExoContext(this.context, key);
    },

    readState<TValue>(): TValue {
        return this.state as TValue;
    },

    /**
     * THE ORDER IS THE SAFETY: the slot is emptied BEFORE the old disposer runs, and the new one is
     * kept only if the slot is STILL empty, so a store that notifies synchronously at subscribe time
     * cannot leave a stale disposer over a live one. The array is read before `start` and after it.
     */
    restartEffect(this: TExoEffectOwner, effect: TExoMachineEffect<TExoEffectOwner>): void {
        const held = this.effectStops;
        if (held === null || held === EXO_DISCONNECTED_EFFECT_STOPS) return;
        const at = effect.at;
        const off = held[at];
        held[at] = null;
        if (off !== null) off();
        const next = effect.start(this);
        const kept = typeof next === 'function' ? next : null;
        if (this.effectStops !== held) {
            if (kept !== null) kept();
            return;
        }
        if (held[at] === null) held[at] = kept;
        else if (kept !== null) kept();
    },

    stopEffect(this: TExoEffectOwner, effect: TExoMachineEffect<TExoEffectOwner>): void {
        const held = this.effectStops;
        if (held === null || held === EXO_DISCONNECTED_EFFECT_STOPS) return;
        const at = effect.at;
        const off = held[at];
        if (off === null) {
            held[at] = EXO_STOPPED_EFFECT;
            return;
        }
        held[at] = null;
        off();
        const revived = held[at] as (() => void) | null;
        if (revived !== null) {
            held[at] = null;
            revived();
        }
    },

    wireExoSelf(params?: unknown): void {
        wireExoNode(this as unknown as TExoNode, params);
    },

    stopEffects(this: TExoEffectOwner): void {
        stopExoEffects(this);
    },
};

export const EXO_BASE_NODE_VOCABULARY = /*#__PURE__*/ exoVocabulary(EXO_BASE_NODE_METHODS);
