import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExoBindable } from './createExoBindable';
import { createExoBindableList } from './createExoBindableList';
import { __DEV__, __resetFlushGuard } from './dev-flush-guard';

// The guard is dev-only; vitest runs with NODE_ENV !== 'production', so it's
// active here. If that ever changes these assertions announce it rather than
// silently passing.
describe('dev flush guard', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        __resetFlushGuard();
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    it('is active under the test env', () => {
        expect(__DEV__).toBe(true);
    });

    it('warns when a subscriber writes another bindable mid-flush', () => {
        const a = createExoBindable(0);
        const b = createExoBindable(0);
        // b.setValue runs inside a's notification loop — the footgun.
        a.subscribe(() => {
            b.setValue(1);
        });

        a.setValue(1);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(String(errorSpy.mock.calls[0][0])).toContain('bindable.setValue');
        expect(String(errorSpy.mock.calls[0][0])).toContain('half-applied');
    });

    it('does not warn for a read-only subscriber', () => {
        const a = createExoBindable(0);
        const seen: number[] = [];
        a.subscribe(v => {
            // pure read — the correct pattern
            seen.push(a.getValue() + (v as number));
        });

        a.setValue(2);

        expect(errorSpy).not.toHaveBeenCalled();
        expect(seen).toEqual([4]);
    });

    it('does not warn for a top-level write (no flush in flight)', () => {
        const a = createExoBindable(0);
        a.subscribe(() => {});
        a.setValue(1);
        a.setValue(2);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('warns when a subscriber mutates a list mid-flush', () => {
        const trigger = createExoBindable(0);
        const rows = createExoBindableList<number>([]);
        rows.subscribeOps(() => {});
        trigger.subscribe(() => {
            rows.push(1);
        });

        trigger.setValue(1);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(String(errorSpy.mock.calls[0][0])).toContain('bindableList.push');
    });

    it('dedupes repeated violations at the same site', () => {
        const a = createExoBindable(0);
        const b = createExoBindable(0);
        a.subscribe(() => {
            b.setValue(b.getValue() + 1);
        });

        a.setValue(1);
        a.setValue(2);
        a.setValue(3);

        // Same source -> target every time: warned once.
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('restores the flush stack when a subscriber throws', () => {
        const a = createExoBindable(0);
        const b = createExoBindable(0);
        a.subscribe(() => {
            throw new Error('boom');
        });

        expect(() => a.setValue(1)).toThrow('boom');

        // The finally cleared the flush frame, so a later independent write is
        // not mistaken for a re-entrant one.
        b.subscribe(() => {});
        b.setValue(1);
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
