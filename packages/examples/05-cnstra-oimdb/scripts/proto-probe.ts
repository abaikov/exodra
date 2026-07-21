// Isolate: does subscribeOnKey fire by CONTENT on a composite-PK (trie) collection?
import {
    OIMEventQueue,
    OIMEventQueueSchedulerFactory,
    OIMReactiveCollection,
    OIMCollectionStoreTrieDriven,
} from '@oimdb/core';

type R = { a: string; b: string; v?: number };
const queue = new OIMEventQueue({ scheduler: OIMEventQueueSchedulerFactory.createMicrotask() });
const col = new OIMReactiveCollection<R, readonly [string, string]>(queue, {
    selectPk: (r) => [r.a, r.b] as const,
    store: new OIMCollectionStoreTrieDriven<R>(),
});

let firedSameRef = 0;
let firedFreshRef = 0;
const key = ['x', 'y'] as const;
col.subscribeOnKey(key, () => firedSameRef++);              // subscribe with instance A
col.subscribeOnKey(['x', 'y'], () => firedFreshRef++);      // subscribe with a DIFFERENT instance

col.upsertOneByPk(['x', 'y'], { a: 'x', b: 'y', v: 1 });    // write with yet another instance
queue.flush();
col.upsertOneByPk(['x', 'y'], { v: 2 });
queue.flush();

console.log('sub(sameRef key) fired  :', firedSameRef);
console.log('sub(freshRef key) fired :', firedFreshRef);
console.log('read back v             :', col.getOneByPk(['x', 'y'])?.v);
console.log(firedFreshRef > 0 ? 'CONTENT-MATCHED subscriptions ✓' : 'subscriptions are BY-REFERENCE ✗');
