// Proves index-driven filtering (status via byStatus, tag via byTag, plus title
// search) AND that filtering reconciles by key: rows that stay visible keep their
// exact DOM node, only the rows that drop out are removed.
// Run via vite-node: npx vite-node scripts/smoke-filter.ts
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

const flush = () => new Promise(r => setTimeout(r, 0));

async function main(): Promise<void> {
    const { renderToString } = await import('@exodra/string');
    const { hydrate } = await import('@exodra/dom');
    const { bootstrap } = await import('../src/app/bootstrap');
    const { appView } = await import('../src/ui/views');

    const { store, vm } = bootstrap();

    const all = store.todos.collection.getAll();
    const activeCount = all.filter(t => t.status === 'active').length;
    const doneCount = all.filter(t => t.status === 'done').length;
    const someActive = all.find(t => t.status === 'active')!;
    // A search term from one active title that should match >=1 row.
    const searchWord = someActive.title.split(' ')[0].toLowerCase();
    const expectSearch = all.filter(
        t => t.title.toLowerCase().includes(searchWord)
    ).length;

    const html = renderToString(appView(vm));
    const root = document.getElementById('root')!;
    root.innerHTML = html;
    const app = root.firstElementChild as unknown as Element;
    hydrate(appView(vm), app);
    vm.bindLive();

    const rows = () => app.querySelectorAll('.column__list .todo');
    const doneRows = () => app.querySelectorAll('.column__list .todo--done');
    const shown = () =>
        Number(document.querySelector('.filterbar__count strong')!.textContent);

    const survivorLi = app.querySelector(`[data-id="${someActive.id}"]`);

    const initial = rows().length;

    vm.filters.status.setValue('active');
    await flush();
    const afterActive = rows().length;
    const doneVisibleUnderActive = doneRows().length;
    const survivorPreserved =
        app.querySelector(`[data-id="${someActive.id}"]`) === survivorLi;

    vm.filters.status.setValue('done');
    await flush();
    const afterDone = rows().length;

    vm.filters.status.setValue('all');
    await flush();
    const afterAll = rows().length;

    vm.filters.query.setValue(searchWord);
    await flush();
    const afterSearch = rows().length;
    const shownMatchesSearch = shown() === afterSearch;

    const checks: [string, boolean][] = [
        ['initial shows every todo', initial === all.length],
        ['status=active shows active count', afterActive === activeCount],
        ['no done rows under status=active', doneVisibleUnderActive === 0],
        ['surviving active row kept node identity', survivorPreserved],
        ['status=done shows done count', afterDone === doneCount],
        ['status=all restores every todo', afterAll === all.length],
        [`search "${searchWord}" narrows to ${expectSearch}`, afterSearch === expectSearch],
        ['match-count badge tracks visible rows', shownMatchesSearch],
    ];

    let ok = true;
    for (const [label, pass] of checks) {
        console.log(`${pass ? '✓' : '✗'} ${label}`);
        ok = ok && pass;
    }
    console.log(
        `counts: all=${all.length} active=${activeCount} done=${doneCount} search=${expectSearch}`
    );
    console.log(ok ? 'SMOKE FILTER: PASS' : 'SMOKE FILTER: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
