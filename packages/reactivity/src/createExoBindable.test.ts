import { describe, expect, it } from 'vitest';
import { createExoBindable } from './createExoBindable';

describe('createExoBindable', () => {
    it('stores a value and emits update events', () => {
        const value = createExoBindable(1);
        const events: number[] = [];

        const unsubscribe = value.subscribe(event => {
            events.push(event);
        });

        value.setValue(2);
        value.setValue(3);
        unsubscribe();
        value.setValue(4);

        expect(value.getValue()).toBe(4);
        expect(events).toEqual([2, 3]);
    });
});
