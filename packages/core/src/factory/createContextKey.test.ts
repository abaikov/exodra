import { describe, expect, it } from 'vitest';
import { createContextKey } from './createContextKey';

describe('createContextKey', () => {
    it('returns a key with a unique Symbol id and the given name', () => {
        const key = createContextKey<number>('theme');
        expect(typeof key.id).toBe('symbol');
        expect(key.name).toBe('theme');
        expect(key.id.description).toBe('theme');
    });

    it('gives every call a DISTINCT id, even with the same name', () => {
        const a = createContextKey('theme');
        const b = createContextKey('theme');
        expect(a.id).not.toBe(b.id); // provide/inject match by identity, not name
    });

    it('allows an anonymous key (no name)', () => {
        const key = createContextKey();
        expect(typeof key.id).toBe('symbol');
        expect(key.name).toBeUndefined();
    });
});
