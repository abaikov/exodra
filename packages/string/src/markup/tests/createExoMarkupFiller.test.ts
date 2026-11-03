import { describe, expect, it } from 'vitest';
import { createExoMarkupFiller } from '../factories/createExoMarkupFiller';
import { exoMarkupFillOrder } from '../exoMarkupFillOrder';

// WHAT THIS FILE IS FOR. `fillMarkup` is the whole server render of one instance: a schema's static
// pieces with the instance's values between them, built by the only function in `@exodra/string`
// that has a BRANCH ON THE SCHEMA rather than on a value. Nothing covered it, so the permuted arm
// could have been swapped for the indexed one and every other test in the package stayed green —
// the two arms agree on every schema whose ports are declared in the order they are printed in,
// which is most of them.

describe('createExoMarkupFiller — the straight indexed arm', () => {
    it('puts the values between the pieces, in order', () => {
        const fill = createExoMarkupFiller(['<p class="', '">', '</p>']);
        expect(fill(['row', 'hello'])).toBe('<p class="row">hello</p>');
    });

    it('a markup with no port is its one piece, and the values are not read', () => {
        const fill = createExoMarkupFiller(['<hr>']);
        expect(fill([])).toBe('<hr>');
        expect(fill(['ignored'])).toBe('<hr>');
    });

    it('an identity `order` resolves to `null`, the straight arm, and prints the same bytes', () => {
        const pieces = ['<a href="', '">', '</a>'];
        const order = exoMarkupFillOrder([0, 1], 2);
        expect(order).toBeNull();
        expect(createExoMarkupFiller(pieces, order)(['/x', 'X'])).toBe(
            createExoMarkupFiller(pieces)(['/x', 'X'])
        );
    });
});

describe('createExoMarkupFiller — the permuted arm', () => {
    it('reads the value `order` names at each hole, not the hole index', () => {
        // The markup prints the text BEFORE the class, and the ports were declared the other way
        // round: port 0 is the class and port 1 the text.
        const fill = createExoMarkupFiller(['<p>', '<b class="', '"></b></p>'], [1, 0]);
        expect(fill(['row', 'hello'])).toBe('<p>hello<b class="row"></b></p>');
    });

    it('serves the same value twice when `order` names it twice', () => {
        const fill = createExoMarkupFiller(['<a title="', '">', '</a>'], [0, 0]);
        expect(fill(['same', 'unused'])).toBe('<a title="same">same</a>');
    });

    it('takes the permuted arm on the FIRST hole that disagrees, not only on hole zero', () => {
        const fill = createExoMarkupFiller(['<i>', '|', '|', '</i>'], [0, 2, 1]);
        expect(fill(['a', 'b', 'c'])).toBe('<i>a|c|b</i>');
    });
});

describe('createExoMarkupFiller — what a caller cannot break afterwards', () => {
    it('COPIES the pieces: mutating them after the call cannot change a rendered page', () => {
        const pieces = ['<p>', '</p>'];
        const fill = createExoMarkupFiller(pieces);
        pieces[0] = '<script>';
        expect(fill(['x'])).toBe('<p>x</p>');
    });

    it('COPIES the order: mutating it after the call cannot move a value to another hole', () => {
        const order = [1, 0];
        const fill = createExoMarkupFiller(['', '|', ''], order);
        order[0] = 0;
        order[1] = 1;
        expect(fill(['a', 'b'])).toBe('b|a');
    });

    it('does not escape and is not asked to: the values arrive written by their writer', () => {
        const fill = createExoMarkupFiller(['<p>', '</p>']);
        expect(fill(['&amp;lt;'])).toBe('<p>&amp;lt;</p>');
    });
});
