import type { TExoBindable, TExoBindableList, TExoWritableBindable, TExoWritableBindableList } from './types';

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
        // Use provided key or auto-generate based on registration order
        const actualKey = key || `_${this.autoIndex++}`;
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