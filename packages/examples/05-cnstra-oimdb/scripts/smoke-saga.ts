// CNS saga smoke (no DOM): the add-task orchestration, stimulated straight into
// the neuron graph.
//  - optimistic add inserts a PENDING task immediately,
//  - the async persist saga settles it → pending clears,
//  - a "fail" title rolls the task back (removed) + emits taskPersistRejected,
//  - an empty title is rejected up front and never inserts.
// Run: npx vite-node scripts/smoke-saga.ts
import {
    createWorkspaceStore,
    loadSnapshot,
    orderedStatuses,
} from '../src/store/workspace-store';
import { createSeed } from '../src/domain/seed';
import {
    createWorkspaceCns,
    addTaskRequested,
    taskPersistRejected,
    type AddTaskCommand,
} from '../src/cns/workspace-cns';

let pass = 0;
const fail: string[] = [];
const ok = (n: string, c: boolean) => {
    if (c) { pass++; console.log('  ✓', n); }
    else { fail.push(n); console.log('  ✗', n); }
};
const tick = () => new Promise(r => setTimeout(r, 0));
const byTitle = (title: string) =>
    oimdbInstance.tasks.collection.getAll().find(t => t.title === title);

const oimdbInstance = createWorkspaceStore();
loadSnapshot(oimdbInstance, createSeed());
// persistDelayMs:0 → the saga's setTimeout fires on the next tick.
const { cns } = createWorkspaceCns(oimdbInstance, { persistDelayMs: 0 });

const base: Omit<AddTaskCommand, 'title'> = {
    projectId: oimdbInstance.projects.collection.getAll().find(p => !p.archived)!.id,
    priority: 'medium',
    statusId: orderedStatuses(oimdbInstance)[0].id,
    assigneeId: null,
    labelId: null,
    tagIds: [],
    milestoneId: null,
};

const rejections: string[] = [];
cns.addResponseListener(res => {
    const out = (res as { outputSignal?: { collateral?: unknown; payload?: { reason?: string } } }).outputSignal;
    if (out?.collateral === taskPersistRejected) rejections.push(out.payload?.reason ?? '');
});

console.log('\n── happy path: optimistic add → settle ──');
cns.stimulate(addTaskRequested.createSignal({ ...base, title: 'Saga happy' }));
const happy = byTitle('Saga happy');
ok('optimistic add inserts the task as PENDING', happy?.pending === true);
await tick();
await tick();
ok('persist settles → pending cleared', oimdbInstance.tasks.collection.getOneByPk(happy!.id)?.pending === false);

console.log('\n── fail path: rollback + rejection ──');
cns.stimulate(addTaskRequested.createSignal({ ...base, title: 'please fail me' }));
const failing = byTitle('please fail me');
ok('failing task is added optimistically (pending)', failing?.pending === true);
const before = rejections.length;
await tick();
await tick();
ok('persist fails → task rolled back (removed)', !oimdbInstance.tasks.collection.getOneByPk(failing!.id));
ok('a taskPersistRejected surfaced with a reason', rejections.length === before + 1 && rejections.at(-1)!.length > 0);

console.log('\n── validation: empty title never inserts ──');
const countBefore = oimdbInstance.tasks.collection.getAll().length;
cns.stimulate(addTaskRequested.createSignal({ ...base, title: '   ' }));
ok('empty title rejected up front — no task inserted', oimdbInstance.tasks.collection.getAll().length === countBefore);

console.log(`\n${'='.repeat(44)}`);
console.log(`SAGA SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.log('FAILED:', fail.join('; ')); process.exit(1); }
