import { describe, expect, it } from 'vitest';
import { h } from '@exodra/core';
import { createStringNode } from './createStringNode';
import { ExoNodeString } from './ExoNodeString';

describe('createStringNode', () => {
    it('constructs an ExoNodeString that renders the schema to HTML', () => {
        const node = createStringNode(
            h('p', { static: { class: 'lead', children: 'hi' } })
        );
        expect(node).toBeInstanceOf(ExoNodeString);
        expect(node.html).toBe('<p class="lead">hi</p>');
    });
});
