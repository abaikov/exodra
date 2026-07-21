// Smoke test for the cnstra orchestration (optimistic add saga + cascade).
// Run: npx tsx scripts/smoke-cns.ts
import { createTodoStore, countByStatus } from '../src/store/todo-store';
import {
    createTodoCns,
    addTodoRequested,
    toggleTodoRequested,
    removeTodoRequested,
    clearDoneRequested,
    statsChanged,
    validationFailed,
} from '../src/cns/todo-cns';

const settle = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
    const store = createTodoStore();
    store.lists.collection.upsertOne({ id: 'work', title: 'Work', color: '#000' });

    // Zero-latency persistence so the saga settles within one macrotask.
    const { cns } = createTodoCns(store, { persistDelayMs: 0 });

    const statsSeen: Array<{ active: number; done: number }> = [];
    const failures: Array<{ command: string; reason: string }> = [];
    cns.addResponseListener(res => {
        const r = res as { outputSignal?: { collateral?: unknown; payload?: unknown } };
        if (r.outputSignal?.collateral === statsChanged) {
            statsSeen.push(r.outputSignal.payload as { active: number; done: number });
        }
        if (r.outputSignal?.collateral === validationFailed) {
            failures.push(r.outputSignal.payload as { command: string; reason: string });
        }
    });

    const addId = (title: string, priority: 'high' | 'low' = 'low') =>
        cns
            .stimulate(
                addTodoRequested.createSignal({ listId: 'work', title, priority, tags: [] })
            )
            .waitUntilComplete();

    // Two valid adds: optimistic + pending until persisted.
    await addId('A', 'high');
    await addId('B');
    const pendingBeforeSettle = store.todos.collection
        .getAll()
        .filter(t => t.pending).length;
    await settle(0); // persist confirms both
    const pendingAfterSettle = store.todos.collection
        .getAll()
        .filter(t => t.pending).length;
    console.log(
        'after 2 adds: total =',
        store.todos.collection.countAll(),
        'pending before/after settle =',
        pendingBeforeSettle,
        '/',
        pendingAfterSettle
    );

    // Invalid commands are rejected before any optimistic insert.
    await addId('   '); // empty title
    await cns
        .stimulate(
            addTodoRequested.createSignal({ listId: 'ghost', title: 'C', priority: 'low', tags: [] })
        )
        .waitUntilComplete();

    // A title that fails to persist: inserted, then rolled back asynchronously.
    await addId('please fail');
    const afterOptimisticFail = store.todos.collection.countAll();
    await settle(0); // persist fails -> rollback
    const afterRollback = store.todos.collection.countAll();
    console.log(
        'fail add: optimistic total =',
        afterOptimisticFail,
        '-> after rollback =',
        afterRollback
    );
    console.log('validation/rollback failures:', failures.length, failures.map(f => f.reason));

    // Toggle two todos done, then cascade clear-done in one command.
    const ids = store.todos.collection.getAllPks().slice(0, 2);
    for (const id of ids)
        await cns.stimulate(toggleTodoRequested.createSignal({ id })).waitUntilComplete();
    const doneBefore = countByStatus(store, 'done');
    await cns.stimulate(clearDoneRequested.createSignal({ listId: 'work' })).waitUntilComplete();
    const doneAfter = countByStatus(store, 'done');
    console.log('clear-done: done', doneBefore, '->', doneAfter);

    // Remove one remaining todo directly.
    const remaining = store.todos.collection.getAllPks();
    if (remaining[0])
        await cns.stimulate(removeTodoRequested.createSignal({ id: remaining[0] })).waitUntilComplete();
    console.log('after remove: total =', store.todos.collection.countAll());
    console.log('stats events seen:', statsSeen.length);

    const ok =
        pendingBeforeSettle === 2 &&
        pendingAfterSettle === 0 &&
        afterOptimisticFail === 3 &&
        afterRollback === 2 &&
        failures.length === 3 && // empty, ghost list, persist rollback
        doneBefore === 2 &&
        doneAfter === 0 &&
        statsSeen.length >= 3;
    console.log(ok ? 'SMOKE CNS: PASS' : 'SMOKE CNS: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error('SMOKE CNS: ERROR', err);
    process.exit(1);
});
