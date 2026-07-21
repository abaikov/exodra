// Pinpoint: does OIMEffectDependencyKeyedCollection.subscribe() itself fire for a
// composite pk? (subscribeOnKey works by content — probe1. computed doesn't — probe2.)
import {
    OIMEventQueue, OIMEventQueueSchedulerFactory, OIMComputeRuntime, OIMEffect,
    OIMReactiveCollection, OIMCollectionStoreTrieDriven,
    OIMEffectDependencyKeyedCollection,
} from '@oimdb/core';

const queue = new OIMEventQueue({ scheduler: OIMEventQueueSchedulerFactory.createMicrotask() });
const runtime = new OIMComputeRuntime(queue);

type C = { a: string; b: string; v: number };
const comp = new OIMReactiveCollection<C, readonly [string, string]>(queue, {
    selectPk: (e) => [e.a, e.b] as const,
    store: new OIMCollectionStoreTrieDriven<C>(),
});

// (1) the dependency's own subscribe() — raw, no effect/computed
const dep = new OIMEffectDependencyKeyedCollection(comp, ['x', 'y'] as const);
let depFired = 0;
dep.subscribe(() => depFired++);

// (2) a full OIMEffect on the same dep
let effectRuns = 0;
new OIMEffect(runtime, {
    deps: [new OIMEffectDependencyKeyedCollection(comp, ['x', 'y'] as const)],
    run: () => { effectRuns++; },
});

comp.upsertOneByPk(['x', 'y'], { a: 'x', b: 'y', v: 1 });
queue.flush();
comp.upsertOneByPk(['x', 'y'], { v: 2 });
queue.flush();

console.log('dependency.subscribe() fired :', depFired);
console.log('OIMEffect runs (incl initial):', effectRuns);
console.log(depFired > 0 ? 'DEP layer OK — break is in effect/computed' : 'BREAK is in the DEPENDENCY (composite key not wired to subscribeOnKey)');

// (3) control: a primitive-pk dep through the same OIMEffect
type P = { id: string; v: number };
const prim = new OIMReactiveCollection<P, string>(queue, { selectPk: (e) => e.id });
let primEffect = 0;
new OIMEffect(runtime, {
    deps: [new OIMEffectDependencyKeyedCollection(prim, 'a')],
    run: () => { primEffect++; },
});
prim.upsertOneByPk('a', { id: 'a', v: 1 });
queue.flush();
console.log('control primitive OIMEffect runs:', primEffect, '(expect >1)');
