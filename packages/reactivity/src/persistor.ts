import type { TExoBindable, TExoBindableList, TExoWritableBindable, TExoWritableBindableList } from '@exodra/reactivity-types';

export interface TExoPersistor {
    register<T>(observable: TExoBindable<T, unknown> | TExoBindableList<T, unknown>, key?: string): void;
    serialize(): string;
    hydrate(json: string): void;
    clear(): void;
}

class ExoPersistor implements TExoPersistor {
    private registry: Map<string, TExoBindable<unknown, unknown> | TExoBindableList<unknown, unknown>> = new Map();
    private autoIndex = 0;

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
            // One protocol: a list's getValue() returns its array, so bindables and
            // lists serialize through the same call. Only the WRITE side (hydrate)
            // still has to tell them apart.
            state[key] = observable.getValue();
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