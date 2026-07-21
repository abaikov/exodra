import { describe, expect, it } from 'vitest';
import { createExoBindableList } from './createExoBindableList';
import type { TExoListOp } from '@exodra/reactivity-types';

describe('createExoBindableList', () => {
    it('mutates items and emits list operations', () => {
        const list = createExoBindableList(['a', 'b']);
        const events: Array<TExoListOp<string>> = [];

        list.subscribeOps(event => {
            events.push(event);
        });

        list.insert(1, 'x');
        list.move(0, 2);
        list.set(1, 'y');
        list.remove(0);
        list.reset(['z']);

        expect(list.snapshot()).toEqual(['z']);
        expect(events).toEqual([
            { type: 'insert', index: 1, item: 'x' },
            { type: 'move', from: 0, to: 2, count: 1 },
            { type: 'set', index: 1, item: 'y' },
            { type: 'remove', index: 0, count: 1 },
            { type: 'reset', items: ['z'] },
        ]);
    });

    it('can drive children as schema objects', () => {
        const childA = { type: 'span', attrs: { id: 'a' } };
        const childB = { type: 'span', attrs: { id: 'b' } };
        const childC = { type: 'span', attrs: { id: 'c' } };
        const children = createExoBindableList([childA, childB, childC]);
        const events: Array<TExoListOp<typeof childA>> = [];

        children.subscribeOps(event => {
            events.push(event);
        });

        children.move(0, 2);

        expect(children.snapshot()).toEqual([childB, childC, childA]);
        expect(events).toEqual([
            { type: 'move', from: 0, to: 2, count: 1 },
        ]);
    });
});
