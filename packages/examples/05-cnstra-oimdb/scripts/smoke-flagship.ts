// End-to-end behaviour smoke for the workspace flagship. Run with vite-node so
// the .tsx pages are JSX-transformed:  npx vite-node scripts/smoke-flagship.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost/' });
const w = dom.window as unknown as Record<string, unknown>;
for (const k of [
    'document',
    'Element',
    'Text',
    'Comment',
    'Node',
    'HTMLElement',
    'DocumentFragment',
    'Event',
    'KeyboardEvent',
    'window',
]) {
    (globalThis as Record<string, unknown>)[k] = w[k];
}
(globalThis as Record<string, unknown>).window = dom.window;

const { mount } = await import('@exodra/dom');
const { createSeed } = await import('../src/domain/seed');
const { createRuntime, setRuntime } = await import('../src/app/runtime');

let pass = 0;
const fail: string[] = [];
const ok = (name: string, cond: boolean) => {
    if (cond) {
        pass++;
        console.log('  ✓', name);
    } else {
        fail.push(name);
        console.log('  ✗', name);
    }
};
const tick = () => new Promise(r => setTimeout(r, 0));

// --- boot the shared runtime (pages read it via getRuntime) ------------------
const rt = createRuntime(createSeed());
setRuntime(rt);

const mountPage = async (loader: () => Promise<{ default: () => unknown }>) => {
    const mod = await loader();
    const c = document.createElement('div');
    const m = mount(mod.default() as never, c);
    return { c, m };
};

console.log('\n── people: edit keeps focus (no full-list reset on a field edit) ──');
{
    const { c } = await mountPage(() => import('../src/pages/people'));
    const before = c.querySelector('[data-id="m-ada"] .member__name') as HTMLInputElement;
    ok('renders member inputs', !!before);
    before.value = 'Adasha';
    before.dispatchEvent(new dom.window.Event('input'));
    await tick();
    const after = c.querySelector('[data-id="m-ada"] .member__name');
    ok('SAME input node survives the edit (focus preserved)', before === after);
    ok('store updated', rt.oimdbInstance.members.collection.getOneByPk('m-ada')?.name === 'Adasha');
    const liCount = c.querySelectorAll('.member').length;
    ok('all members still rendered', liCount === rt.oimdbInstance.members.collection.getAll().length);
}

console.log('\n── board: renders kanban, move dispatches CNS + logs activity ──');
{
    const { c } = await mountPage(() => import('../src/pages/board'));
    ok('renders 5 status columns', c.querySelectorAll('.col').length === 5);
    const cardsBefore = c.querySelectorAll('.card').length;
    ok('renders task cards', cardsBefore > 0);

    // tk-5 is in s-todo; find its card and move it right (To do -> In progress).
    const card = c.querySelector('[data-id="tk-5"]') as HTMLElement;
    ok('finds task card tk-5', !!card);
    const col = card.closest('.col') as HTMLElement;
    ok('tk-5 starts in To do column', col?.getAttribute('data-status') === 's-todo');
    const activityBefore = rt.oimdbInstance.activity.collection.getAll().length;
    (card.querySelector('[aria-label="Move right"]') as HTMLElement).dispatchEvent(
        new dom.window.Event('click')
    );
    await tick();
    ok('store: tk-5 moved to In progress', rt.oimdbInstance.tasks.collection.getOneByPk('tk-5')?.statusId === 's-doing');
    const card2 = c.querySelector('[data-id="tk-5"]') as HTMLElement;
    ok('card re-homed into In progress column', card2?.closest('.col')?.getAttribute('data-status') === 's-doing');
    ok('cnstra logged an activity record', rt.oimdbInstance.activity.collection.getAll().length === activityBefore + 1);
}

console.log('\n── delete cascade: deleting a task removes its comments ──');
{
    const before = rt.oimdbInstance.commentsByTask.getPksByKey('tk-3').size;
    ok('tk-3 has comments to start', before > 0);
    rt.deleteTask('tk-3');
    await tick();
    ok('task gone', !rt.oimdbInstance.tasks.collection.getOneByPk('tk-3'));
    ok('its comments cascaded away', rt.oimdbInstance.commentsByTask.getPksByKey('tk-3').size === 0);
}

console.log('\n── add-task saga: optimistic pending insert ──');
{
    const n = rt.oimdbInstance.tasks.collection.getAll().length;
    rt.addTask({
        projectId: 'p-engine',
        title: 'smoke task',
        priority: 'medium',
        statusId: 's-backlog',
        assigneeId: null,
        labelId: null,
        tagIds: [],
        milestoneId: null,
    });
    await tick();
    const added = rt.oimdbInstance.tasks.collection.getAll().find(t => t.title === 'smoke task');
    ok('optimistic task inserted', !!added);
    ok('inserted as pending (saga in flight)', added?.pending === true);
    ok('count grew by 1', rt.oimdbInstance.tasks.collection.getAll().length === n + 1);
}

console.log('\n── cnstra drain → oimdb flush: the ONLY commit point ──');
{
    // Every mutation is a stimulation; the runtime's addDrainListener flushes the
    // (scheduler-less) oimdb queue when the turn drains, so subscribers fire on
    // that same synchronous tick — for orchestrated commands AND reference-data.
    let taskSync = false;
    const off1 = rt.oimdbInstance.tasks.collection.subscribeOnAnyUpdate(() => { taskSync = true; });
    rt.addTask({
        projectId: 'p-engine',
        title: 'drain sync task',
        priority: 'medium',
        statusId: 's-backlog',
        assigneeId: null,
        labelId: null,
        tagIds: [],
        milestoneId: null,
    });
    off1();
    ok('orchestrated command flushed synchronously (drain)', taskSync);

    let refSync = false;
    const off2 = rt.oimdbInstance.tags.collection.subscribeOnAnyUpdate(() => { refSync = true; });
    rt.createEntity('tags', { id: 'tg-drain', name: 'Drain', color: '#0af' });
    off2();
    ok('reference-data write ALSO flushed synchronously (goes through CNS)', refSync);

    // Nothing flushes without a CNS drain: a raw write straight to the collection
    // (bypassing the runtime, which no app code does) never notifies — no
    // scheduler — until an explicit flush. Proves the drain is the only commit.
    let rawSync = false;
    const off3 = rt.oimdbInstance.labels.collection.subscribeOnAnyUpdate(() => { rawSync = true; });
    rt.oimdbInstance.labels.collection.upsertOne({ id: 'lb-raw', name: 'Raw', color: '#000' } as never);
    const rawBeforeTick = rawSync;
    await tick();
    const rawAfterTick = rawSync;
    rt.oimdbInstance.queue.flush();
    off3();
    ok('raw non-CNS write did NOT flush synchronously', !rawBeforeTick);
    ok('raw non-CNS write did NOT flush on a microtask either (no scheduler)', !rawAfterTick);
    ok('raw write flushed only on an explicit queue.flush()', rawSync);
}

console.log(`\n${'='.repeat(48)}`);
console.log(`FLAGSHIP SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) {
    console.log('FAILED:', fail.join('; '));
    process.exit(1);
}
