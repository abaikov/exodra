# TodoMVC: Exodra + OIMDB + CNStra

A small TodoMVC built on the local sources of three libraries:

- **Exodra** (this repository) renders. Both components are machines (`createExoSchema` +
  `createExoMachineBuilder`) on one `withExoChildList(withExoCompiler(new ExoDomBackend()))` —
  the todo list is `reconcileExoOrder` over `c.childList`, which that pack adds.
- **OIMDB** (`../oimdb`) holds the state: a todo collection, an index of todos by `done`, a
  positional bucket that keeps creation order, and a single slot for the filter.
- **CNStra** (`../cnstra`) runs the commands. Every user action is a signal; its neuron writes
  to OIMDB, and one drain listener flushes OIMDB at the end of each synchronous turn.

It resolves `@exodra/*`, `@oimdb/*` and `@cnstra/*` straight from the three repositories'
`src` folders (see `vite.config.ts`), so nothing has to be built or installed.

## Run

From the root of this repository (expects `oimdb` and `cnstra` checked out next to it):

```bash
npx vite packages/examples/todo-cnstra-oimdb
```

## Where things are

| File | What it is |
| --- | --- |
| `src/createTodoDb.ts` | the OIMDB services and store slots |
| `src/TODO_SIGNALS.ts` | the commands, one collateral each |
| `src/TODO_NEURONS.ts` | the neurons that write each command into OIMDB |
| `src/todoCns.ts` | the CNS and its `addDrainListener(() => db.flush())` |
| `src/TODO_READS.ts` | plain OIMDB reads, and the slots each machine effect subscribes to with `OIMEffectService.subscribeEffect` |
| `src/TODO_APP.ts` | the app machine: one listener per event type on the root, the reconciled list |
| `src/TODO_ROW.ts` | the row machine: a wire that writes ports, re-run with `wireExoNode` |
