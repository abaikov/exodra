// Copied character for character out of `README.md` — the "List Rendering" block — and checked
// against it by `readme-verbatim.test.ts`. The block's two `@exodra/dom` lines are absent: they are
// the entry point, which is a backend's by definition.
// >>> BEGIN VERBATIM — README.md, "List Rendering"
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoWire,
} from '@exodra/core';
import type { TExoChildrenWiring, TExoMachineNode } from '@exodra/core';

type TTodo = { readonly id: number; readonly text: string };

const todos: TTodo[] = [{ id: 1, text: 'Learn Exodra' }];

const TodoPorts = exoPorts({ text: EXO_PORT_TEXT });

const todoSchema = createExoSchema(TodoPorts, (b) => {
    b.el('li', { class: 'todo' }, (li) => {
        li.textPort(TodoPorts.text);
    });
});
const todoBase = createExoMachine(todoSchema, {
    createInitialState: (_c: TExoMachineNode, todo: TTodo) => todo,
});
const Todo = withExoWire(todoBase, (c) => {
    c.text(TodoPorts.text, c.state.text);
});

const TodoListPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const todoListSchema = createExoSchema(TodoListPorts, (b) => {
    b.el('ul', null, (ul) => {
        ul.childrenPort(TodoListPorts.rows);
    });
});
const TodoList = createExoMachine<TExoChildrenWiring & TExoMachineNode>(todoListSchema, {
    createInitialState: (c) => {
        c.list(TodoListPorts.rows, Todo, todos);
    },
});
// <<< END VERBATIM

export { Todo, TodoList, todos };
