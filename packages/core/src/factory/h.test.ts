import { describe, expect, it } from 'vitest';
import { h } from './h';
import { text } from './text';

describe('schema helpers', () => {
    it('creates schema nodes with static, bindables, and list bindings', () => {
        const bindables = { textContent: { getValue: () => 'hello' } };
        const bindableLists = { children: { snapshot: () => [] } };
        const schema = h('div', { 
            static: {
                id: 'app',
                children: text('child')
            },
            bindables, 
            bindableLists 
        });

        expect(schema).toMatchObject({
            type: 'div',
            attrs: {
                static: {
                    id: 'app',
                    children: {
                        type: '#text',
                        attrs: {
                            static: {
                                textContent: 'child',
                            },
                        },
                    },
                },
                bindables,
                bindableLists,
            },
        });
    });
});
