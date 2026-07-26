import type { TExoBindable, TExoBindableList, TExoWritableBindable, TExoWritableBindableList } from '@exodra/reactivity-types';
import { __DEV__ } from './dev-flush-guard';

export interface TExoPersistor {
    register<T>(observable: TExoBindable<T, unknown> | TExoBindableList<T, unknown>, key?: string): void;
    serialize(): string;
    hydrate(json: string): void;
    clear(): void;
}

class ExoPersistor implements TExoPersistor {
    private registry: Map<string, TExoBindable<unknown, unknown> | TExoBindableList<unknown, unknown>> = new Map();
    private autoIndex = 0;
    private warnedAutoKey = false;

    register<T>(
        observable: TExoBindable<T, unknown> | TExoBindableList<T, unknown>,
        key?: string
    ): void {
        // Auto-keys are POSITIONAL (`_0`, `_1`, …). They only round-trip when the
        // exact same register() calls run in the exact same order on both sides of
        // a serialize/hydrate boundary. If the server and client register in a
        // different order (a common divergence: conditional/lazy state), `_0` names
        // a DIFFERENT observable on each side and hydrate() silently loads the wrong
        // value into the wrong signal. Explicit keys are strongly recommended for
        // anything that crosses an SSR/hydration boundary.
        const actualKey = key ?? `_${this.autoIndex++}`;
        if (__DEV__ && key === undefined && !this.warnedAutoKey) {
            this.warnedAutoKey = true;
            // eslint-disable-next-line no-console
            console.warn(
                `[exodra] persistor.register() was called without a key, so a ` +
                    `positional auto-key ("${actualKey}") was used. Positional keys ` +
                    `only survive serialize/hydrate when registration order is ` +
                    `identical on both sides — otherwise state is loaded into the ` +
                    `wrong observable. Pass a stable explicit key: persist(x, 'x').`
            );
        }

        // A different observable registered under an already-used key would be
        // silently overwritten, losing one of the two on serialize. Fail loudly.
        const existing = this.registry.get(actualKey);
        if (existing !== undefined && existing !== observable) {
            throw new Error(
                `[exodra] persistor: duplicate key "${actualKey}" registered for ` +
                    `two different observables. Keys must be unique — one would ` +
                    `overwrite the other and its persisted state would be lost.`
            );
        }
        this.registry.set(actualKey, observable);
    }
    
    serialize(): string {
        const state: Record<string, unknown> = {};
        
        for (const [key, observable] of this.registry) {
            if ('getValue' in observable) {
                // It's a bindable
                state[key] = observable.getValue();
            } else if ('snapshot' in observable) {
                // It's a list
                state[key] = observable.snapshot();
            }
        }
        
        return JSON.stringify(state);
    }
    
    hydrate(json: string): void {
        const state = JSON.parse(json);
        
        for (const [key, observable] of this.registry) {
            if (!(key in state)) {
                continue;
            }
            
            const value = state[key];
            
            if ('setValue' in observable && typeof observable.setValue === 'function') {
                // It's a writable bindable
                (observable as TExoWritableBindable<unknown, unknown>).setValue(value);
            } else if ('reset' in observable && typeof observable.reset === 'function') {
                // It's a writable list
                (observable as TExoWritableBindableList<unknown, unknown>).reset(value as readonly unknown[]);
            }
        }
    }
    
    clear(): void {
        this.registry.clear();
        this.autoIndex = 0;
        this.warnedAutoKey = false;
    }
}

// Global instance for SSR
let globalPersistor: ExoPersistor | null = null;

export function getPersistor(): ExoPersistor {
    if (!globalPersistor) {
        globalPersistor = new ExoPersistor();
    }
    return globalPersistor;
}

export function createPersistor(): ExoPersistor {
    return new ExoPersistor();
}

// Helper to auto-register observables
export function persist<T>(
    observable: TExoBindable<T, unknown> | TExoBindableList<T, unknown>,
    key?: string
): typeof observable {
    getPersistor().register(observable, key);
    return observable;
}