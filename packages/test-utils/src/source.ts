import type { TExoTestSource } from './types/TExoTestSource';

// Synchronous, unconditional (no equality check) and notified over a COPY of the set — suites
// depend on all three, and README says which cases would break without each.
export const source = <TValue>(initial: TValue): TExoTestSource<TValue> => {
    let value = initial;
    const subs = new Set<(...event: never[]) => void>();
    return {
        getValue: () => value,
        setValue: (next) => {
            value = next;
            for (const cb of Array.from(subs)) cb();
        },
        onChange: (cb) => {
            subs.add(cb);
            return () => subs.delete(cb);
        },
        subscribers: () => subs.size,
    };
};
