import { describe, expect, it } from 'vitest';
import { exoContextFrame, nextExoId, provideExoIds, readExoContext } from '../index';
import type { TExoContextFrame, TExoContextToken } from '../index';

function holder(outer: TExoContextFrame | null = null) {
    return {
        context: outer,
        provide<TValue>(key: TExoContextToken<TValue>, value: TValue): void {
            this.context = exoContextFrame(this.context, key, value);
        },
        inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined {
            return readExoContext(this.context, key);
        },
    };
}

describe('provideExoIds / nextExoId', () => {
    it('hands out ids in call order under the provided prefix', () => {
        const root = holder();
        provideExoIds(root, 'app');
        const below = holder(root.context);
        expect([nextExoId(root), nextExoId(below), nextExoId(below)]).toEqual([
            'app-0',
            'app-1',
            'app-2',
        ]);
    });

    it('a fresh provide starts its own count and shadows the one above', () => {
        const root = holder();
        provideExoIds(root, 'app');
        const page = holder(root.context);
        provideExoIds(page, nextExoId(root));
        expect(nextExoId(page)).toBe('app-0-0');
        expect(nextExoId(root)).toBe('app-1');
    });

    it('two renders count from the same start, because the counter lives in the render', () => {
        const first = holder();
        provideExoIds(first, 'app');
        nextExoId(first);
        const second = holder();
        provideExoIds(second, 'app');
        expect(nextExoId(second)).toBe('app-0');
    });

    it('refuses when nothing above provided ids', () => {
        expect(() => nextExoId(holder())).toThrow(/provideExoIds/);
    });
});
