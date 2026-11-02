# TodoMVC: Exodra + OIMDB + CNStra

A small TodoMVC built on the local sources of three libraries:

-   **Exodra** (this repository) renders. Both components are machines (`exoPorts` +
    `createExoSchema` + `createExoMachine` and its `withExo*` decorators); the todo list is `reconcileExoOrder` over
    `c.childList`, and `createExoDelegatedEvents` puts one listener per event type on the render
    root while each row keeps its own event ports and handlers.
-   **OIMDB** (`../oimdb`) holds the state: a todo collection, an index of todos by `done`, a
    positional bucket that keeps creation order, and a single slot for the filter.
-   **CNStra** (`../cnstra`) reacts to what the user did. The machines only say what happened, on
    `TodoUiAxon`; the domain neurons react and write to OIMDB. One drain
    listener flushes OIMDB at the end of each synchronous turn. The CNS reaches the machines
    through the Exodra context, not through an import.

It resolves `@exodra/*`, `@oimdb/*` and `@cnstra/*` straight from the three repositories'
`src` folders (see `vite.config.ts`), so nothing has to be built or installed.

## Against React

`../todo-react-rtk` is the same app on React and Redux Toolkit. This one is about twice as long
(517 lines in 19 files against 218 in 4), and what the length buys is this: state that only one
component needs stays in that component's `c.state`, so it costs a field write and a port write,
not a subscription, a scheduled flush and a re-render. Where data has to reach deep into the tree
and update everyone who shows it, OIMDB carries it, and that cost is paid there and nowhere else.

## Run

From the root of this repository (expects `oimdb` and `cnstra` checked out next to it):

```bash
npx vite packages/examples/todo-cnstra-oimdb
```

## Where things are

| File                                            | What it is                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/createTodoDb.ts`                           | the OIMDB services and store slots                                                                                        |
| `src/TodoUiAxon.ts`                             | what the user did: one collateral per interaction                                                                         |
| `src/TodoAxon.ts`, `src/TodoFilterAxon.ts`      | what the domain neurons answer, one collateral per response                                                               |
| `src/TodoNeurons.ts`                            | the todo and filter neurons: each binds UI collaterals and writes OIMDB                                                   |
| `src/createTodoCns.ts`                          | the CNS over those neurons and its `addDrainListener(() => oimdb.getInstance().flush())`                                  |
| `src/TodoCnsContext.ts`, `src/injectTodoCns.ts` | the context token the app provides the CNS under, and the read the machines use                                           |
| `src/main.ts`                                   | the backend with `createExoDelegatedEvents`, and the render that hands the app its CNS                                    |
| `src/TodoApp.ts`                                | the app machine: header, footer, filters, and the reconciled list, each read straight from OIMDB inside an `oimdb.effect` |
| `src/TodoRow.ts`                                | the row machine: its own event ports and handlers, one `oimdb.effect` per column it shows (`title`, `done`)               |
