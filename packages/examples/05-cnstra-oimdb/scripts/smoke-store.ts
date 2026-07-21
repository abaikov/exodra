// Standalone smoke test for the oimdb store layer. Run: npx tsx scripts/smoke-store.ts
import { createTodoStore, getTodosByList, countByStatus, takeSnapshot } from '../src/store/todo-store';
import type { Todo, TodoList } from '../src/domain/types';

const tick = () => new Promise<void>(resolve => queueMicrotask(resolve));

async function main() {
    const store = createTodoStore();

    const lists: TodoList[] = [
        { id: 'work', title: 'Work', color: '#2563eb' },
        { id: 'home', title: 'Home', color: '#16a34a' },
    ];
    store.lists.collection.upsertMany(lists);

    const todos: Todo[] = [
        { id: 't1', listId: 'work', title: 'Ship release', status: 'active', priority: 'high', tags: ['urgent', 'release'], createdAt: 1 },
        { id: 't2', listId: 'work', title: 'Write tests', status: 'active', priority: 'medium', tags: ['quality'], createdAt: 2 },
        { id: 't3', listId: 'home', title: 'Buy groceries', status: 'done', priority: 'low', tags: ['errand'], createdAt: 3 },
        { id: 't4', listId: 'home', title: 'Fix sink', status: 'active', priority: 'high', tags: ['urgent', 'errand'], createdAt: 4 },
    ];

    let anyUpdates = 0;
    const unsub = store.todos.collection.subscribeOnAnyUpdate(() => {
        anyUpdates += 1;
    });

    store.todos.collection.upsertMany(todos);
    await tick();

    const work = getTodosByList(store, 'work').map(t => t.title);
    const home = getTodosByList(store, 'home').map(t => t.title);
    const active = countByStatus(store, 'active');
    const done = countByStatus(store, 'done');
    const urgentPks = [...store.todosByTag.getPksByKey('urgent')].sort();

    console.log('work list (priority order):', work);
    console.log('home list (priority order):', home);
    console.log('active count:', active, 'done count:', done);
    console.log('urgent tag pks:', urgentPks);
    console.log('anyUpdate fired:', anyUpdates > 0);

    // toggle t1 -> done, expect status index to move it
    store.todos.collection.upsertOneByPk('t1', { status: 'done' });
    await tick();
    console.log('after toggle t1: active=', countByStatus(store, 'active'), 'done=', countByStatus(store, 'done'));

    const snap = takeSnapshot(store);
    console.log('snapshot sizes: lists=', snap.lists.length, 'todos=', snap.todos.length);

    unsub();

    const ok =
        work[0] === 'Ship release' &&
        home[0] === 'Fix sink' &&
        active === 3 &&
        done === 1 &&
        urgentPks.length === 2 &&
        anyUpdates > 0;
    console.log(ok ? 'SMOKE STORE: PASS' : 'SMOKE STORE: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error('SMOKE STORE: ERROR', err);
    process.exit(1);
});
