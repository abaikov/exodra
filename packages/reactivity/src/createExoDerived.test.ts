import { describe, expect, it } from 'vitest';
import { createExoBindable } from './createExoBindable';
import { createExoDerived } from './createExoDerived';

describe('createExoDerived', () => {
    it('maps the source value', () => {
        const source = createExoBindable(2);
        const doubled = createExoDerived(source, n => n * 2);

        expect(doubled.getValue()).toBe(4);
        source.setValue(5);
        expect(doubled.getValue()).toBe(10);
    });

    it('emits the mapped value when the source updates', () => {
        const source = createExoBindable(1);
        const label = createExoDerived(source, n => `n=${n}`);
        const seen: string[] = [];

        const unsubscribe = label.subscribe(value => seen.push(value));
        source.setValue(2);
        source.setValue(3);
        unsubscribe();
        source.setValue(4);

        expect(seen).toEqual(['n=2', 'n=3']);
        expect(label.getValue()).toBe('n=4');
    });

    it('composes (derive of a derive)', () => {
        const source = createExoBindable(3);
        const plusOne = createExoDerived(source, n => n + 1);
        const asText = createExoDerived(plusOne, n => String(n));

        expect(asText.getValue()).toBe('4');
        source.setValue(9);
        expect(asText.getValue()).toBe('10');
    });
});
