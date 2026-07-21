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
    ok('store updated', rt.store.members.collection.getOneByPk('m-ada')?.name === 'Adasha');
    const liCount = c.querySelectorAll('.member').length;
    ok('all members still rendered', liCount === rt.store.members.collection.getAll().length);
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
    const activityBefore = rt.store.activity.collection.getAll().length;
    (card.querySelector('[aria-label="Move right"]') as HTMLElement).dispatchEvent(
        new dom.window.Event('click')
    );
    await tick();
    ok('store: tk-5 moved to In progress', rt.store.tasks.collection.getOneByPk('tk-5')?.statusId === 's-doing');
    const card2 = c.querySelector('[data-id="tk-5"]') as HTMLElement;
    ok('card re-homed into In progress column', card2?.closest('.col')?.getAttribute('data-status') === 's-doing');
    ok('cnstra logged an activity record', rt.store.activity.collection.getAll().length === activityBefore + 1);
}

console.log('\n── delete cascade: deleting a task removes its comments ──');
{
    const before = rt.store.commentsByTask.getPksByKey('tk-3').size;
    ok('tk-3 has comments to start', before > 0);
    rt.deleteTask('tk-3');
    await tick();
    ok('task gone', !rt.store.tasks.collection.getOneByPk('tk-3'));
    ok('its comments cascaded away', rt.store.commentsByTask.getPksByKey('tk-3').size === 0);
}

console.log('\n── add-task saga: optimistic pending insert ──');
{
    const n = rt.store.tasks.collection.getAll().length;
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
    const added = rt.store.tasks.collection.getAll().find(t => t.title === 'smoke task');
    ok('optimistic task inserted', !!added);
    ok('inserted as pending (saga in flight)', added?.pending === true);
    ok('count grew by 1', rt.store.tasks.collection.getAll().length === n + 1);
}

console.log(`\n${'='.repeat(48)}`);
console.log(`FLAGSHIP SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) {
    console.log('FAILED:', fail.join('; '));
    process.exit(1);
}
