// Does OIMComputed recompute when a KeyedCollection dep changes? primitive vs composite pk.
import {
    OIMEventQueue, OIMEventQueueSchedulerFactory, OIMComputeRuntime, OIMComputed,
    OIMReactiveCollection, OIMCollectionStoreTrieDriven,
    OIMEffectDependencyKeyedCollection,
} from '@oimdb/core';

const queue = new OIMEventQueue({ scheduler: OIMEventQueueSchedulerFactory.createMicrotask() });
const runtime = new OIMComputeRuntime(queue);

// --- primitive pk ---
type P = { id: string; v: number };
const prim = new OIMReactiveCollection<P, string>(queue, { selectPk: (e) => e.id });
let primComputes = 0;
const primView = new OIMComputed<number>(runtime, {
    deps: [new OIMEffectDependencyKeyedCollection(prim, 'a')],
    compute: () => { primComputes++; return prim.getOneByPk('a')?.v ?? -1; },
});
console.log('primitive: initial get       :', primView.get(), '(computes:', primComputes + ')');
prim.upsertOneByPk('a', { id: 'a', v: 10 });
queue.flush();
console.log('primitive: after write+flush  :', primView.get(), '(computes:', primComputes + ')');
prim.upsertOneByPk('a', { v: 20 });
queue.flush();
console.log('primitive: after 2nd write    :', primView.get(), '(computes:', primComputes + ')');

// --- composite pk ---
type C = { a: string; b: string; v: number };
const comp = new OIMReactiveCollection<C, readonly [string, string]>(queue, {
    selectPk: (e) => [e.a, e.b] as const,
    store: new OIMCollectionStoreTrieDriven<C>(),
});
let compComputes = 0;
const compView = new OIMComputed<number>(runtime, {
    deps: [new OIMEffectDependencyKeyedCollection(comp, ['x', 'y'] as const)],
    compute: () => { compComputes++; return comp.getOneByPk(['x', 'y'])?.v ?? -1; },
});
console.log('composite: initial get        :', compView.get(), '(computes:', compComputes + ')');
comp.upsertOneByPk(['x', 'y'], { a: 'x', b: 'y', v: 10 });
queue.flush();
console.log('composite: after write+flush   :', compView.get(), '(computes:', compComputes + ')');
comp.upsertOneByPk(['x', 'y'], { v: 20 });
queue.flush();
console.log('composite: after 2nd write     :', compView.get(), '(computes:', compComputes + ')');
