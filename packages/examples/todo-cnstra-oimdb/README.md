# TodoMVC: Exodra + OIMDB + CNStra

A small TodoMVC built on the local sources of three libraries:

-   **Exodra** (this repository) renders. Both components are machines (`exoPorts` +
    `createExoSchema` + `createExoMachine` and its `withExo*` decorators). OIMDB is wired in by
    the `@oimdb/exodra` plugin: `new OIMExodraPlugin({ db })` is composed onto the backend as
    `exodraPlugin`, `withOIMEffects` runs a tracked `db.createEffect` per effect (the row follows
    its todo, the app its counts and filter), and `withOIMBucketList` follows the shown bucket and
    replays what OIMDB recorded (`insert` / `remove` / `move`) on the rows port's child list. A row that leaves
    the list, by a command or by a filter switch, is parked on its todo's slot (`slot.data`) with its
    effects disconnected and taken back when it shows again; the plugin unmounts a parked row when
    its slot is released, and the list unmounts the rest when it goes.
    `createExoDelegatedEvents` puts one listener per event type on the render root.
-   **OIMDB** (`@oimdb/core` 4.10, one `OIMDB` built with `createSchemas`) holds the state: a todo
    collection, two indexes (all todos, todos by `done`) on positional buckets that record their
    changes with `OIMBucketCommands`, and a single slot for the filter. A toggled todo is moved back
    to its creation position in its new bucket, so every filter shows creation order.
-   **CNStra** (`../cnstra`) reacts to what the user did. The machines only say what happened, on
    `TodoUiAxon`, mostly through receptors (`withCNSReceptors`, from `@cnstra/exodra`); the domain neurons react and write to OIMDB. One drain
    listener flushes OIMDB at the end of each synchronous turn. The database and the CNS are
    built once in `main.ts` and composed onto the backend as services, so every machine reads
    `c.todoDb`, `c.cns` and `c.exodraPlugin` straight off its node; `injectCNS` looks for a CNS given by `provideCNS`
    first and falls back to `c.cns`.

It resolves `@exodra/*`, `@oimdb/core`, `@oimdb/exodra`, `@cnstra/core` and `@cnstra/exodra` straight from the three
repositories' `src` folders (see `vite.config.ts`), because the oimdb and cnstra working trees carry changes that are not
published yet.

## Against React

`../todo-react-rtk` is the same app on React and Redux Toolkit. This one is about twice as long
(830 lines in 25 files against 218 in 4), and what the length buys is this: state that only one
component needs stays in that component's `c.state`, so it costs a field write and a port write,
not a subscription, a scheduled flush and a re-render. Where data has to reach deep into the tree
and update everyone who shows it, OIMDB carries it, and that cost is paid there and nowhere else.

## Run

From the root of this repository (expects `oimdb` and `cnstra` checked out next to it):

```bash
npx vite packages/examples/todo-cnstra-oimdb
```

## Where things are

| File                     | What it is                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/createTodoOimdb.ts` | the `OIMDB` and its `todos` schema: the collection, the two command-recording indexes, the filter slot, `nextTodoId` and `putInCreatedOrder`                      |
| `src/TodoUiAxon.ts`      | what the user did: one collateral per interaction                                                                                                                 |
| `src/TodoNeurons.ts`     | the todo and filter neurons: each binds UI collaterals and writes OIMDB                                                                                           |
| `src/createTodoCns.ts`   | the CNS over those neurons and its `addDrainListener(() => oimdb.flush())`                                                                                        |
| `src/main.ts`            | the database, the CNS, and the backend that carries both as services (`composeExoPlugins(..., { todoDb, cns, exodraPlugin })`) next to `createExoDelegatedEvents` |
| `src/todoAppMachine.ts`  | the app machine: header, toggle-all, footer, filters, the empty state, and the list driven by the shown bucket's commands                                         |
| `src/todoRowMachine.ts`  | the row machine: its own event ports and handlers, one `withOIMEffects` effect for its title and one for `done`                                                   |
