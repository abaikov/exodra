import { describe, expect, it, vi } from 'vitest';
import { bindable } from './bindable';
import { combine } from './combine';
import { derive } from './derive';
import { list } from './list';

describe('combine', () => {
    it('passes each source value to the computation, in order', () => {
        const count = bindable(2);
        const label = bindable('items');
        const text = combine([count, label], (n, name) => `${n} ${name}`);

        expect(text.getValue()).toBe('2 items');
        count.setValue(5);
        expect(text.getValue()).toBe('5 items');
    });

    it('notifies when ANY source changes', () => {
        const a = bindable(1);
        const b = bindable(1);
        const sum = combine([a, b], (x, y) => x + y);

        const seen: number[] = [];
        sum.onChange(value => seen.push(value));

        a.setValue(2);
        b.setValue(10);
        expect(seen).toEqual([3, 12]);
    });

    it('does not notify when the computed value is unchanged', () => {
        const a = bindable(1);
        const b = bindable(5);
        // The loser of a max() can move all it likes without changing anything.
        const biggest = combine([a, b], (x, y) => Math.max(x, y));

        const listener = vi.fn();
        biggest.onChange(listener);

        a.setValue(2);
        a.setValue(3);
        a.setValue(0);
        expect(biggest.getValue()).toBe(5);
        expect(listener).not.toHaveBeenCalled();

        a.setValue(9);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(9);
    });

    it('computes on read, not eagerly', () => {
        const source = bindable(1);
        const compute = vi.fn((value: number) => value * 2);
        const doubled = combine([source], compute);

        // Nothing read it yet.
        expect(compute).not.toHaveBeenCalled();
        expect(doubled.getValue()).toBe(2);
        expect(compute).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from every source when the last listener goes', () => {
        const a = bindable(1);
        const b = bindable(1);
        const sum = combine([a, b], (x, y) => x + y);

        const first = vi.fn();
        const second = vi.fn();
        const offFirst = sum.onChange(first);
        const offSecond = sum.onChange(second);

        a.setValue(2);
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);

        offFirst();
        a.setValue(3);
        expect(first).toHaveBeenCalledTimes(1); // gone
        expect(second).toHaveBeenCalledTimes(2);

        offSecond();
        a.setValue(4);
        expect(second).toHaveBeenCalledTimes(2);
        // …and the value still reads correctly with nothing subscribed.
        expect(sum.getValue()).toBe(5);
    });

    it('re-subscribes cleanly after every listener has left', () => {
        const a = bindable(1);
        const sum = combine([a], x => x);

        const off = sum.onChange(() => {});
        off();
        a.setValue(7); // changed while nobody was listening

        const listener = vi.fn();
        sum.onChange(listener);
        a.setValue(8);
        expect(listener).toHaveBeenCalledWith(8);
    });

    it('ignores a repeated unsubscribe instead of tearing down someone else', () => {
        const a = bindable(1);
        const sum = combine([a], x => x);

        const off = sum.onChange(() => {});
        const listener = vi.fn();
        sum.onChange(listener);

        off();
        off(); // must not unsubscribe the second listener's sources
        a.setValue(2);
        expect(listener).toHaveBeenCalledWith(2);
    });

    it('accepts no sources at all (a constant)', () => {
        const constant = combine([], () => 42);
        expect(constant.getValue()).toBe(42);
        expect(() => constant.onChange(() => {})()).not.toThrow();
    });

    it('combines sources of different value types', () => {
        const on = bindable(true);
        const name = bindable('core');
        const label = combine([on, name], (enabled, text) =>
            enabled ? text : `${text} (off)`
        );
        expect(label.getValue()).toBe('core');
        on.setValue(false);
        expect(label.getValue()).toBe('core (off)');
    });

    it('takes a list as a source — a list is just a bindable of an array', () => {
        const items = list([1, 2]);
        const total = combine([items], values =>
            values.reduce((sum, value) => sum + value, 0)
        );

        const seen: number[] = [];
        total.onChange(value => seen.push(value));
        items.push(3);
        expect(total.getValue()).toBe(6);
        expect(seen).toEqual([6]);
    });

    it('nests: a combined value is itself a source', () => {
        const a = bindable(1);
        const b = bindable(2);
        const c = bindable(3);
        const inner = combine([a, b], (x, y) => x + y);
        const outer = combine([inner, c], (sum, extra) => sum * extra);

        const listener = vi.fn();
        outer.onChange(listener);
        expect(outer.getValue()).toBe(9);

        a.setValue(2);
        expect(outer.getValue()).toBe(12);
        expect(listener).toHaveBeenCalledWith(12);
    });

    it('composes with derive', () => {
        const a = bindable(2);
        const b = bindable(3);
        const product = combine([a, b], (x, y) => x * y);
        const text = derive(product, value => `= ${value}`);

        expect(text.getValue()).toBe('= 6');
        b.setValue(4);
        expect(text.getValue()).toBe('= 8');
    });
});
