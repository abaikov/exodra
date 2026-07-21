// Proves the cnstra add-saga + cascade:
//  - optimistic add inserts a PENDING row immediately (todo--pending),
//  - async persist confirms -> pending clears on the same DOM node,
//  - a failing title rolls back -> the row is removed + an error surfaces,
//  - clear-done cascades removal of every done todo in a list.
// Run via vite-node: npx vite-node scripts/smoke-saga.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>'
);
const g = globalThis as Record<string, unknown>;
for (const k of [
    'window',
    'document',
    'Node',
    'Text',
    'Element',
    'HTMLElement',
    'DocumentFragment',
    'Comment',
]) {
    g[k] = (dom.window as unknown as Record<string, unknown>)[k];
}

const settle = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main(): Promise<void> {
    const { renderToString } = await import('@exodra/string');
    const { hydrate } = await import('@exodra/dom');
    const { createTodoStore } = await import('../src/store/todo-store');
    const { createTodoCns, addTodoRequested, toggleTodoRequested, clearDoneRequested } =
        await import('../src/cns/todo-cns');
    const { createViewModel } = await import('../src/app/view-model');
    const { appView } = await import('../src/ui/views');
    const { seedLists, seedTodos } = await import('../src/domain/seed');

    const store = createTodoStore();
    store.lists.collection.upsertMany([...seedLists]);
    store.todos.collection.upsertMany([...seedTodos]);
    const cns = createTodoCns(store, { persistDelayMs: 30 });
    const vm = createViewModel(store, cns);

    const html = renderToString(appView(vm));
    const root = document.getElementById('root')!;
    root.innerHTML = html;
    const app = root.firstElementChild as unknown as Element;
    hydrate(appView(vm), app);
    vm.bindLive();

    const listId = store.lists.collection.getAll()[0].id;
    const rowsIn = (id: string) =>
        app.querySelectorAll(`.column[data-list="${id}"] .todo`).length;
    const pendingRows = () => app.querySelectorAll('.todo--pending').length;

    // --- 1. optimistic add: pending row visible before persist settles ---
    const before = rowsIn(listId);
    cns.cns.stimulate(
        addTodoRequested.createSignal({
            listId,
            title: 'Ship the release',
            priority: 'high',
            tags: ['demo'],
        })
    );
    await settle(0); // flush oimdb microtask, persist (30ms) not yet fired
    const addedRow = rowsIn(listId) === before + 1;
    const isPending = pendingRows() === 1;

    await settle(60); // persist confirms
    const stillThere = rowsIn(listId) === before + 1;
    const pendingCleared = pendingRows() === 0;

    // --- 2. failing add rolls back ---
    cns.cns.stimulate(
        addTodoRequested.createSignal({
            listId,
            title: 'This will fail to save',
            priority: 'low',
            tags: [],
        })
    );
    await settle(0);
    const failPending = rowsIn(listId) === before + 2;
    await settle(60); // persist fails -> rollback
    const rolledBack = rowsIn(listId) === before + 1;
    const errorShown = /fail/i.test(String(vm.errorText.getValue()));

    // --- 3. cascade clear-done ---
    // Mark two todos in the list done, then clear them in one command.
    const listPks = [...store.todosByList.getPksByKey(listId)];
    const toFinish = listPks
        .filter(pk => store.todos.collection.getOneByPk(pk)?.status === 'active')
        .slice(0, 2);
    for (const id of toFinish)
        cns.cns.stimulate(toggleTodoRequested.createSignal({ id }));
    await settle(0);
    const doneBefore = app.querySelectorAll(
        `.column[data-list="${listId}"] .todo--done`
    ).length;
    cns.cns.stimulate(clearDoneRequested.createSignal({ listId }));
    await settle(0);
    const doneAfter = app.querySelectorAll(
        `.column[data-list="${listId}"] .todo--done`
    ).length;

    const checks: [string, boolean][] = [
        ['optimistic add inserts a row immediately', addedRow],
        ['the new row is marked pending', isPending],
        ['row survives a successful persist', stillThere],
        ['pending flag clears after persist', pendingCleared],
        ['failing add is momentarily pending', failPending],
        ['failing add rolls the row back out', rolledBack],
        ['rollback surfaces an error message', errorShown],
        ['clear-done had >=2 done rows to clear', doneBefore >= 2],
        ['clear-done cascades them all out', doneAfter === 0],
    ];

    let ok = true;
    for (const [label, pass] of checks) {
        console.log(`${pass ? '✓' : '✗'} ${label}`);
        ok = ok && pass;
    }
    console.log(ok ? 'SMOKE SAGA: PASS' : 'SMOKE SAGA: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
