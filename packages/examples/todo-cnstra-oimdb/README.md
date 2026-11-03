# TodoMVC: Exodra + OIMDB + CNStra

A small TodoMVC built on the local sources of three libraries:

-   **Exodra** (this repository) renders. Both components are machines (`exoPorts` +
    `createExoSchema` + `createExoMachine` and its `withExo*` decorators). Two example-local
    plugins wire OIMDB in: `withExoOimWatches` turns a slot `watch` into an Exodra effect (the row
    follows its `title` and `done` columns), and `withExoOimBucketList` follows the shown bucket and
    replays what OIMDB recorded (`insert` / `remove` / `move`) on `c.childList`. A row that leaves
    the list, by a command or by a filter switch, is parked on its todo's slot (`slot.data`) with its
    effects disconnected and taken back when it shows again; `exoOimRowReleaseListener` unmounts
    a parked row when its slot is released, and the list unmounts the rest when it goes.
    `createExoDelegatedEvents` puts one listener per event type on the render root.
-   **OIMDB** (`@oimdb/core` 4.9, one `OIMDB` built with `createSchemas` and the plugin's `slotReleaseListener`) holds the state: a todo
    collection, two indexes (all todos, todos by `done`) on positional buckets that record their
    changes with `OIMBucketCommands`, and a single slot for the filter. A toggled todo is moved back
    to its creation position in its new bucket, so every filter shows creation order.
-   **CNStra** (`../cnstra`) reacts to what the user did. The machines only say what happened, on
    `TodoUiAxon`, mostly through receptors (`TodoEnvironment.withReceptors`, from `@cnstra/exodra`); the domain neurons react and write to OIMDB. One drain
    listener flushes OIMDB at the end of each synchronous turn. The database and the CNS are
    built once in `main.ts` and composed onto the backend as services, so every machine reads
    `c.oimdb`, `c.todoDb` and `c.cns` straight off its node; the receptors look in the environment's context
    token first and fall back to `c.cns`.

It resolves `@exodra/*`, `@oimdb/core`, `@cnstra/core` and `@cnstra/exodra` straight from the three repositories' `src`
folders (see `vite.config.ts`): `slot.watch` and `slotReleaseListener` exist in `@oimdb/core` 4.9,
which is not published yet.

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

| File                                                                                         | What it is                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/createTodoOimdb.ts`                                                                     | the `OIMDB` and its `todos` schema: the collection, the two command-recording indexes, the filter slot, `nextTodoId` and `putInCreatedOrder`                                                           |
| `src/TodoUiAxon.ts`                                                                          | what the user did: one collateral per interaction                                                                                                                                                      |
| `src/TodoNeurons.ts`                                                                         | the todo and filter neurons: each binds UI collaterals and writes OIMDB                                                                                                                                |
| `src/createTodoCns.ts`                                                                       | the CNS over those neurons and its `addDrainListener(() => oimdb.flush())`                                                                                                                             |
| `src/main.ts`                                                                                | the database, the CNS, and the backend that carries both as services (`composeExoPlugins(..., { oimdb, todoDb, cns })`) next to `createExoDelegatedEvents`                                             |
| `src/TodoEnvironment.ts`                                                                     | the app's `CNSExodraEnvironment` from `@cnstra/exodra`: receptors turn DOM events into signals, and the CNS is taken from the environment's context token first, then from the backend's `cns` service |
| `src/withExoOimWatches.ts`, `src/withExoOimBucketList.ts`, `src/exoOimRowReleaseListener.ts` | the OIMDB plugins: a slot `watch` as an Exodra effect, the bucket list with command replay and parked rows, and the release listener that unmounts a parked row                                        |
| `src/todoAppMachine.ts`                                                                      | the app machine: header, toggle-all, footer, filters, the empty state, and the list driven by the shown bucket's commands                                                                              |
| `src/todoRowMachine.ts`                                                                      | the row machine: its own event ports and handlers, one `db.createEffect` per column it shows (`title`, `done`)                                                                                         |
