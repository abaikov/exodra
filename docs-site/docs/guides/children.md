---
sidebar_position: 4
---

# Children

A **children port** is a place in a schema where other machines' instances stand. It is declared
as `EXO_PORT_CHILDREN` in `exoPorts` and placed with `childrenPort(Ports.x)` (or `<$.x />` in JSX),
and it renders exactly where that call stands in the markup.

A children port has the same kind of API an element has in the DOM: you create a node, put it in,
move it, take it out. Everything else on this page — fixed lists, reconciled lists, keyed lists —
is sugar over these few calls.

## The calls

```ts
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    destroyExoNode,
    exoPorts,
    wireExoNode,
    withExoHandlers,
    withExoTransitions,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

type TTodo = { readonly id: number; readonly title: string };

const TodoPorts = exoPorts({ title: EXO_PORT_TEXT, done: EXO_PORT_EVENT });
const todoSchema = createExoSchema(TodoPorts, (b) => {
    b.el('li', null, (li) => {
        li.textPort(TodoPorts.title);
        li.eventPort(TodoPorts.done, 'click');
    });
});
const todoMachine = composeExoMachine(
    createExoMachine(todoSchema, {
        createInitialState: (_c: TExoMachineNode, todo: TTodo) => ({ todo, done: false }),
    }),
    (m) =>
        withExoTransitions(m, {
            markDone: (c) => {
                c.state.done = true;
                c.text(TodoPorts.title, `✓ ${c.state.todo.title}`);
            },
        }),
    (m) =>
        withExoWire(m, (c, todo: TTodo) => {
            c.state.todo = todo;
            c.text(TodoPorts.title, todo.title);
        }),
    (m) => {
        const { markDone } = m.transitions;
        return withExoHandlers(m, (on) => on(TodoPorts.done, (c) => markDone(c)));
    }
);

const BoardPorts = exoPorts({ open: EXO_PORT_CHILDREN, archive: EXO_PORT_CHILDREN });
const boardSchema = createExoSchema(BoardPorts, (b) => {
    b.el('section', null, (section) => {
        section.el('ul', { class: 'open' }, (ul) => ul.childrenPort(BoardPorts.open));
        section.el('ul', { class: 'archive' }, (ul) => ul.childrenPort(BoardPorts.archive));
    });
});
const boardMachine = createExoMachine(boardSchema, {
    createInitialState: (c: TExoDomNode, todos: readonly TTodo[]) => {
        for (const todo of todos) {
            const node = c.createExoNode(todoMachine);
            wireExoNode(node, todo);
            c.appendChild(BoardPorts.open, node);
        }
        return {};
    },
});

const board = backend.createExoNode(boardMachine);
wireExoNode(board, [
    { id: 1, title: 'write the docs' },
    { id: 2, title: 'ship it' },
]);
const unmount = backend.mountRoot(board, document.body);

const first = board.childAt(BoardPorts.open, 0);
if (first !== undefined) {
    board.moveChild(first, BoardPorts.archive, 0);
    wireExoNode(first, { id: 1, title: 'docs written' });
    board.removeChild(first);
    destroyExoNode(first);
}

unmount();
```

| call                                                                 | what it does                                                                                                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `c.createExoNode(machine)`                                           | a node of `machine`, with the context of `c` above it. Nothing is wired yet: no state, no `wire`, no effects                                                                                           |
| `wireExoNode(node, params)`                                          | the **first** call runs `createInitialState(c, params)`, then `wire(c, params)`, then starts the effects. Every later call runs `wire(c, params)` again. Nothing keeps `params` after the call returns |
| `c.appendChild(port, node)`                                          | puts the node at the end of `port`                                                                                                                                                                     |
| `c.insertChild(port, node, at)`                                      | puts the node at position `at` of `port` (past the end means the end)                                                                                                                                  |
| `c.moveChild(node, at)`                                              | moves the node to position `at` of the port it is in                                                                                                                                                   |
| `c.moveChild(node, port, at?)`                                       | moves the node into another port of `c`, at `at` or at the end                                                                                                                                         |
| `c.removeChild(node)`                                                | takes the node out of the tree. **It stays alive**: state, element, effects and subscriptions are kept, and it can be put back                                                                         |
| `c.replaceChildren(port)`                                            | destroys every node in `port` and empties it                                                                                                                                                           |
| `c.childAt(port, at)`, `c.childCount(port)`                          | read what a port holds                                                                                                                                                                                 |
| `disconnectExoNode(node)` / `connectExoNode(node)`                   | stop the node's effects, and start them again from its current state                                                                                                                                   |
| `destroyExoNode(node)`                                               | ends the node: takes it out of its port if it is in one, stops its effects, runs its teardowns, and destroys the nodes in its own ports                                                                |
| `backend.createExoNode(machine)` + `backend.mountRoot(node, parent)` | the same lifecycle for the root of a page; `mountRoot` returns the function that destroys it                                                                                                           |

## The lifecycle, and the cases at its edges

A node goes **created → wired → placed**, may be moved, removed and placed again any number of
times, and ends **destroyed**. Wiring and placing are independent: either may come first.

| written                                           | what happens                                                                                                                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wireExoNode` before `appendChild`                | on the client the node already has its element, so the wire writes into it while it is detached, and inserting it is one DOM call                                                              |
| `appendChild` before `wireExoNode`                | the node stands in the page with empty ports until it is wired                                                                                                                                 |
| a second `wireExoNode`                            | `createInitialState` does not run again; `wire` runs with the new params, so state survives                                                                                                    |
| a transition on a node never wired                | it has no state yet, so the node is wired with no params first and the transition runs on that state. On a hydrating page it waits with the wire (see below)                                   |
| `appendChild` of a node that is already in a port | the node moves, exactly as `appendChild` of an attached element moves it in the DOM. It is not re-created, re-wired or re-mounted                                                              |
| `moveChild`                                       | the element moves; nothing is re-wired. Call `wireExoNode` yourself if the data changed                                                                                                        |
| `removeChild`                                     | the node leaves the tree and keeps running: its effects still listen. Call `disconnectExoNode` to pause them, or `destroyExoNode` to end the node                                              |
| a node removed and never destroyed                | the parent no longer holds it, so destroying the parent does **not** reach it. Whoever removed it owns it — the same rule as `removeChild` on a DOM element whose listeners are still attached |
| a node created and never placed                   | the same: nothing reaches it but the variable it is in                                                                                                                                         |
| `destroyExoNode` on a placed node                 | it is taken out of its port first, then ended                                                                                                                                                  |
| destroying a parent                               | every node standing in the parent's ports at that moment is destroyed with it                                                                                                                  |
| `c.replaceChildren(port)`                         | every node in the port is destroyed; the fastest way to empty a port, because a port that owns its element is cleared in one DOM call                                                          |
| effects                                           | they start on the first wire. A node wired and never placed has running effects; a node placed and never wired has none                                                                        |

## On the server

`@exodra/string` answers the same calls. A child's markup is taken **when the parent's markup is**,
so a wire that runs after `appendChild` still reaches the page, and so does a child appended into a
parent that is itself already placed. Every node standing in a port is destroyed when its parent's
markup has been taken, at the end of the request. Moving and removing work, and change what is
printed.

## Hydration

On a page the server rendered, the first time a node is placed in a port it takes the element the
server printed **at that position in that port**, instead of building one. Nothing is shared
between ports, so two lists filled in any order, or a node created for somewhere else while a list
is being filled, never take each other's elements.

| written                                              | what happens while hydrating                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wireExoNode` before the first placement             | the wire waits for the placement — the node has no element yet — and runs on the server's element when it is placed. Transitions called in the meantime wait too and run right after the wire, in the order they were called. Only `params` and those calls are held, and only until then |
| the client places more nodes than the server printed | the extra ones are built like on the client                                                                                                                                                                                                                                               |
| the client places fewer                              | the server's elements nobody took are removed when the parent's own hydration ends                                                                                                                                                                                                        |
| a node placed after the parent finished hydrating    | it is built like on the client                                                                                                                                                                                                                                                            |
| a reconciler made by `createExoChildrenReconciler`   | the same: every list adopts its own rows by position, even when several lists are opened in `createInitialState` and filled later                                                                                                                                                         |
| the client's data differs from the server's          | the node still takes the element at its position, and its wire writes the new values into it                                                                                                                                                                                              |

## Sugar on top

| call                                                | what it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `c.one(port, machine, params?)`                     | one node, created, wired and placed in one call, for the life of `c`. It is placed once: call it in `createInitialState` ([`EXO0103`](../errors.md#exo0103))                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `c.list(port, machine, rows)`                       | a fixed run: node `i` is wired with `rows[i]`. No diff, no row records — a list that cannot change pays nothing for the possibility                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `createExoChildrenReconciler(rowMachine, options?)` | the reconciler of [Lists](./lists.md), from `@exodra/list-reconcile`, created once at module level. Calling it as `reconcile(c, port, items)` gives every new item a node of `rowMachine` wired with the item, keeps the node of every item that stays, and destroys the rest. It remembers what it showed per node and port, so the machine keeps no shown order. `{ key }` reconciles by key instead of identity, `{ skipFirst, skipLast }` leaves that many children at either end of the port alone, and a build function `(c, item) => node` may stand in place of `rowMachine` |

`c.one` and `c.list` own their port: the port methods and the reconcilers refuse a port either of
them filled ([`EXO0114`](../errors.md#exo0114)). Children placed by hand go in a separate children
port.

## What it costs

Creating and wiring a node are two calls: the element is cloned on creation and the wire writes
into it detached, so inserting it is one DOM call. Each node record carries `machine`,
`portChildren` and `placedIn`; the mount axis reads 1.238× of its floor with them (0.390 ms
against `clone+refs` at 0.3150 ms). The calls themselves have not been measured on their own axis yet.
