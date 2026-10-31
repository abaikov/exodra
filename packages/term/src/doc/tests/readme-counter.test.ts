// The acceptance test, run rather than typed. `readme-verbatim.test.ts` proves the component below
// is the README's character for character; this proves it RENDERS through a backend the README has
// never heard of, and that its click transition can be fired by a backend with no DOM and no event
// system.
//
// Nothing here casts, wraps or adapts `COUNTER`.
import { describe, expect, it } from 'vitest';
import { COUNTER } from '../readme-counter';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import { exoTermFind } from '../../utilities/exoTermFind';
import { exoTermFire } from '../../utilities/exoTermFire';

/**
 * ONE BACKEND FOR THE FILE, AT MODULE LOAD, which is the shape every caller of this package owes.
 * The schema cache is keyed on the backend by pointer, so a `new ExoTermBackend()` inside each `it`
 * would compile `COUNTER`'s schema three times and hang three links off one schema — and the test
 * would still pass, which is why it is written down here rather than left to notice.
 */
const BACKEND = new ExoTermBackend();

describe('the README’s counter, rendered by a fourth backend', () => {
    it('renders, stays live, and dispatches — then goes quiet when disposed', () => {
        const screen = BACKEND.renderScreen(COUNTER, 1);

        // THE SHAPE THE SCHEMA DESCRIBES, printed as a tree. Two attributes on the button in
        // DECLARATION order, the text port's value inline on the span, the static child on its
        // own line, and the event port visible as a listener the markup backends cannot print.
        expect(screen.text()).toBe(
            [
                'div class="counter"',
                '  span "Count: 0"',
                '  button class="btn" type="button" on:click',
                '    "Increment"',
            ].join('\n')
        );

        // DISPATCH: the handler the wire put in the event port, run by name. `@exodra/string`
        // accepts the same call and prints nothing for it.
        const button = exoTermFind(screen.roots[0], 'button');
        expect(button).not.toBeNull();
        expect(exoTermFire(button as NonNullable<typeof button>, 'click')).toBe(true);
        expect(exoTermFire(button as NonNullable<typeof button>, 'click')).toBe(true);
        expect(screen.text()).toContain('span "Count: 2"');

        // AN EVENT NOBODY IS LISTENING FOR is a false, not a throw — a terminal input loop has
        // to be able to fall through to the next candidate.
        expect(exoTermFire(button as NonNullable<typeof button>, 'keydown')).toBe(false);

        screen.dispose();
    });

    it('renders n instances the way both shipped entry points do', () => {
        const screen = BACKEND.renderScreen(COUNTER, 3);
        expect(screen.roots).toHaveLength(3);
        const lines = screen.text().split('\n');
        const heads = lines.filter((line) => line.startsWith('div'));
        expect(heads).toHaveLength(3);
        screen.dispose();
    });

    it('colours the same tree for a terminal when asked', () => {
        const screen = BACKEND.renderScreen(COUNTER, 1);
        const esc = String.fromCharCode(27);
        const coloured = screen.text({ ansi: true });
        expect(coloured).toContain(esc + '[1mdiv' + esc + '[0m');
        expect(coloured).toContain(esc + '[32m"Count: 0"' + esc + '[0m');
        screen.dispose();
    });
});
