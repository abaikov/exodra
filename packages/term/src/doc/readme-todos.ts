// Copied character for character out of `README.md` — the "List Rendering" block — and checked
// against it by `readme-verbatim.test.ts`. The block's two `@exodra/dom` lines are absent: they are
// the entry point, which is a backend's by definition.
// >>> BEGIN VERBATIM — README.md, "List Rendering"
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoChildrenWiring, TExoMachineNode, TExoTextPort } from '@exodra/core';

type TTodo = { readonly id: number; readonly text: string };

const todos: TTodo[] = [{ id: 1, text: 'Learn Exodra' }];

const TODO_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'todo' }, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mTodo = createExoMachineBuilder<TExoMachineNode, unknown, TTodo>(TODO_SCHEMA);
mTodo.createInitialState((_c, index) => todos[index]);
mTodo.wire((c) => {
    c.text(TODO_SCHEMA.ports.text, c.state.text);
});
const TODO = mTodo.done();

const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
const mList = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(LIST_SCHEMA);
mList.createInitialState((c) => {
    c.list(LIST_SCHEMA.ports.rows, TODO, todos.length);
});
const TODO_LIST = mList.done();
// <<< END VERBATIM

export { TODO, TODO_LIST, todos };
