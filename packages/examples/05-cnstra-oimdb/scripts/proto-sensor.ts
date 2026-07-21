// PROTOTYPE (hypothesis check, not the lib): the sensor READ-side expressed
// purely in oimdb 3.8 primitives.
//   • request-state lives in a collection whose PK is the ARGS TUPLE itself
//     (composite PK via trie store) — no stableStringify, matched by content.
//   • the view is ONE OIMComputed derived from (request-state entry) + (domain
//     index) → { phase: idle|loading|success|error, error, data }.
//   • request-state changes ONLY by mutation (startedAt/endedAt/error facts);
//     phase is DERIVED from timestamps. data comes from the domain collection
//     (no duplication).
// Run: npx vite-node scripts/proto-sensor.ts
import {
    OIMEventQueue,
    OIMEventQueueSchedulerFactory,
    OIMComputeRuntime,
    OIMComputed,
    OIMReactiveCollection,
    OIMCollectionStoreTrieDriven,
    OIMEffectDependencyKeyedCollection,
    OIMEffectDependencyKeyedIndex,
    createOIMCollectionKit,
} from '@oimdb/core';

type Member = { id: string; teamId: string; name: string };
// Request-state: facts only. PK is the args tuple [teamId, status].
type ReqState = {
    teamId: string;
    status: string;
    startedAt?: number;
    endedAt?: number;
    error?: string | null;
};

let pass = 0;
const fail: string[] = [];
const ok = (n: string, c: boolean) => {
    if (c) { pass++; console.log('  ✓', n); }
    else { fail.push(n); console.log('  ✗', n); }
};

const queue = new OIMEventQueue({
    scheduler: OIMEventQueueSchedulerFactory.createMicrotask(),
});
const runtime = new OIMComputeRuntime(queue);

// Domain collection + derived index (data lives here, no dup in request-state).
const members = createOIMCollectionKit<Member, string>(queue, {
    selectPk: (m) => m.id,
});
const byTeam = members.indexFactory.derivedSetIndex<string>((m) => m.teamId);

// Request-state collection with a COMPOSITE PK (args tuple) via trie store.
const reqState = new OIMReactiveCollection<ReqState, readonly [string, string]>(
    queue,
    {
        selectPk: (r) => [r.teamId, r.status] as const,
        store: new OIMCollectionStoreTrieDriven<ReqState>(),
    }
);

// The view: one derived. args = (teamId, status). Note the PK is a FRESH tuple
// every call — trie matches it by content.
type View = {
    phase: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    data: (Member | undefined)[];
};
function makeView(teamId: string, status: string): OIMComputed<View> {
    const argsPk = [teamId, status] as const;
    return new OIMComputed<View>(runtime, {
        deps: [
            new OIMEffectDependencyKeyedCollection(reqState, argsPk),
            new OIMEffectDependencyKeyedIndex(byTeam, teamId),
        ],
        compute: (): View => {
            const r = reqState.getOneByPk([teamId, status]); // fresh tuple, content match
            const phase: View['phase'] =
                !r || r.startedAt == null
                    ? 'idle'
                    : r.endedAt == null
                      ? 'loading'
                      : r.error
                        ? 'error'
                        : 'success';
            const pks = byTeam.getPksByKey(teamId);
            const data = [...pks].map((pk) => members.collection.getOneByPk(pk));
            return { phase, error: r?.error ?? null, data };
        },
    });
}

// ── mutations (the ONLY thing that changes request-state) ────────────────────
const now = { t: 0 };
const kick = (teamId: string, status: string) =>
    reqState.upsertOneByPk([teamId, status], {
        teamId, status, startedAt: ++now.t, endedAt: undefined, error: null,
    });
const settleOk = (teamId: string, status: string, rows: Member[]) => {
    members.collection.upsertMany(rows);
    reqState.upsertOneByPk([teamId, status], { endedAt: ++now.t, error: null });
};
const settleErr = (teamId: string, status: string, msg: string) =>
    reqState.upsertOneByPk([teamId, status], { endedAt: ++now.t, error: msg });

// ── drive it ─────────────────────────────────────────────────────────────────
const view = makeView('t1', 'open');
queue.flush();
console.log('\n── idle → loading → success → error, all through one derived ──');
ok('idle before any request', view.get().phase === 'idle');

kick('t1', 'open');
queue.flush();
ok('loading after kick (startedAt, no endedAt)', view.get().phase === 'loading');

settleOk('t1', 'open', [
    { id: 'm1', teamId: 't1', name: 'Ann' },
    { id: 'm2', teamId: 't1', name: 'Bob' },
]);
queue.flush();
{
    const v = view.get();
    ok('success after settle', v.phase === 'success');
    ok('data resolved from DOMAIN collection (no dup)',
        v.data.map((m) => m?.name).sort().join(',') === 'Ann,Bob');
}

console.log('\n── refetch keeps data; error never nukes it ──');
kick('t1', 'open');
queue.flush();
{
    const v = view.get();
    ok('phase back to loading on refetch', v.phase === 'loading');
    ok('but data still present (lives in domain collection)', v.data.length === 2);
}
settleErr('t1', 'open', 'network down');
queue.flush();
{
    const v = view.get();
    ok('phase error', v.phase === 'error' && v.error === 'network down');
    ok('stale data STILL there under the error', v.data.length === 2);
}

console.log('\n── composite PK: different args = different entry, matched by content ──');
const viewClosed = makeView('t1', 'closed');
queue.flush();
ok('sibling args (t1,closed) is idle — independent entry', viewClosed.get().phase === 'idle');
ok('original (t1,open) still error — not clobbered', view.get().phase === 'error');
// fresh tuple instance resolves to the SAME bucket as the writes above:
ok('fresh [t1,open] tuple reads the same entry by content',
    reqState.getOneByPk(['t1', 'open'])?.error === 'network down');

console.log('\n── domain row change re-derives the view (index dep) ──');
members.collection.upsertOneByPk('m1', { name: 'Annie' });
queue.flush();
ok('view.data reflects the renamed member', view.get().data.some((m) => m?.name === 'Annie'));

console.log(`\n${'='.repeat(56)}`);
console.log(`PROTO SENSOR: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.log('FAILED:', fail.join('; ')); process.exit(1); }
