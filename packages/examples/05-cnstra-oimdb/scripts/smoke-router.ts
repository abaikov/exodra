// Proves SSR-aware URL filters (via @exodra/router query helpers): the server
// renders the already-filtered board from ?status=/?tag=/?q=, and the
// query<->state bridge round-trips. Run: npx vite-node scripts/smoke-router.ts

async function main(): Promise<void> {
    const { render } = await import('../src/entry-server');
    const { createRouter, createMemoryHistory } = await import('@exodra/router');
    const { createTodoStore } = await import('../src/store/todo-store');
    const { seedLists, seedTodos } = await import('../src/domain/seed');

    const store = createTodoStore();
    store.lists.collection.upsertMany([...seedLists]);
    store.todos.collection.upsertMany([...seedTodos]);
    const all = store.todos.collection.getAll();
    const total = all.length;
    const doneCount = all.filter(t => t.status === 'done').length;

    const rowsIn = (html: string) => (html.match(/data-id="/g) ?? []).length;

    const htmlAll = render('/').appHtml;
    const htmlDone = render('/?status=done').appHtml;
    const htmlSearch = render('/?q=ship').appHtml;
    const expectSearch = all.filter(t =>
        t.title.toLowerCase().includes('ship')
    ).length;

    // The filter binding itself: router.bindQuery gives a two-way bindable that
    // the example's controls bind to (status/tag/q).
    const router = createRouter([], { history: createMemoryHistory('/') });
    const status = router.bindQuery('status', { default: 'all' });
    const seen: string[] = [];
    status.subscribe(value => seen.push(value));

    const startedDefault = status.getValue() === 'all';
    await status.setValue('done');
    const reflectsValue = status.getValue() === 'done';
    const urlReflects = /status=done/.test(router.getLocation().search);
    await status.setValue('all'); // back to default removes the key
    const clearedUrl = router.getLocation().search === '';
    const notified = seen.includes('done') && seen.includes('all');

    const checks: [string, boolean][] = [
        ['SSR "/" renders every todo', rowsIn(htmlAll) === total],
        ['SSR "?status=done" renders only done', rowsIn(htmlDone) === doneCount && doneCount > 0],
        ['SSR done view has no active rows', !/todo--active/.test(htmlDone) && (htmlDone.match(/todo--done/g) ?? []).length === doneCount],
        ['SSR marks the Done option selected', /value="done"\s+selected/.test(htmlDone)],
        ['SSR "?q=ship" narrows by search', rowsIn(htmlSearch) === expectSearch && expectSearch > 0],
        ['bindQuery starts at the default', startedDefault],
        ['bindQuery.setValue writes the URL', reflectsValue && urlReflects],
        ['clearing to default empties the URL', clearedUrl],
        ['bindQuery notifies subscribers on change', notified],
    ];

    let ok = true;
    for (const [label, pass] of checks) {
        console.log(`${pass ? '✓' : '✗'} ${label}`);
        ok = ok && pass;
    }
    console.log(`total=${total} done=${doneCount} search=${expectSearch}`);
    console.log(ok ? 'SMOKE ROUTER: PASS' : 'SMOKE ROUTER: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
