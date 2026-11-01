// The second acceptance test — the WIDE surface. `TodoList` is typed against
// `TExoChildrenWiring & TExoMachineNode` and calls `c.list(…, Todo, todos.length)`: the half of the
// exported API whose signatures name the exonode recursively.
//
// A FIXED LIST DOES NOT FOLLOW ITS DATA, and that is the contract being asserted here rather than a
// shortcoming of the test: it builds a row per item and keeps no diff, no registry and no
// subscription. Following a source is a reconciler layered over `build` and `childList` from
// outside this package, and no such layer names this backend yet, so a REACTIVE term list is
// unproven and is named here rather than left to look covered.
import { describe, expect, it } from 'vitest';
import { TodoList, todos } from '../readme-todos';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import { exoTermFind } from '../../utilities/exoTermFind';

/** ONE BACKEND FOR THE FILE, AT MODULE LOAD — the schema cache is keyed on it by pointer. */
const BACKEND = new ExoTermBackend();

describe('the README’s todo list, rendered by a fourth backend', () => {
    it('builds one row per item, reading each item by its index', () => {
        const screen = BACKEND.renderScreen(TodoList, 1);

        expect(screen.text()).toBe(['ul', '  li class="todo" "Learn Exodra"'].join('\n'));
        expect(exoTermFind(screen.roots[0], 'li')).not.toBeNull();
        screen.dispose();
    });

    it('builds every item a second render is given, in order', () => {
        todos.push({ id: 2, text: 'Build app' });
        const screen = BACKEND.renderScreen(TodoList, 1);

        expect(screen.text()).toBe(
            ['ul', '  li class="todo" "Learn Exodra"', '  li class="todo" "Build app"'].join('\n')
        );
        screen.dispose();
    });
});
