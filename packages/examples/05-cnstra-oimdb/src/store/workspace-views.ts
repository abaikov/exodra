import { exoDb } from '@oimdb/exodra';
import type { WorkspaceStore } from './workspace-store';

// The Exodra-side READ layer over the oimdb store: every collection + its named
// indexes as a facade. Reads are reactive and self-subscribing — no hand-paired
// read+subscribe. Writes stay on the store/CNS.
//
// The identity-first way the pages use it (see @oimdb/exodra README):
//   view.<index>.rows(key, (entity, pk) => …)  — a list; key IS the pk, no key fn
//   view.<index>.pks(key)                       — membership, for a per-row count
//   view.<coll>.byPk(pk) / .all() / .allPks()   — one entity / whole collection
//   view.tasks.byStatus.list(key, …)            — O(delta) ordered (board columns)
// NEVER fold row state into a key: anything that varies WITHIN a row binds inside
// the row. Holes: a raw index read is length-aligned with `undefined`; `.compact()`
// drops them, `.unsafeDense()` asserts dense — every index here is derived from its
// own collection (pks always resolve), but the pages read entities via `.rows`/
// `byPk`, so hole handling rarely surfaces at the page level.
export function createWorkspaceViews(s: WorkspaceStore) {
    return exoDb({
        teams: { kit: s.teams },
        members: { kit: s.members, indexes: { byTeam: s.membersByTeam } },
        projects: { kit: s.projects },
        milestones: { kit: s.milestones, indexes: { byProject: s.milestonesByProject } },
        statuses: { kit: s.statuses, indexes: { byOrder: s.statusesByOrder } },
        tags: { kit: s.tags },
        labels: { kit: s.labels },
        tasks: {
            kit: s.tasks,
            indexes: {
                byStatus: s.tasksByStatus,
                byProject: s.tasksByProject,
                byMilestone: s.tasksByMilestone,
                byAssignee: s.tasksByAssignee,
                byTag: s.tasksByTag,
                byLabel: s.tasksByLabel,
                byCreated: s.tasksByCreated,
            },
        },
        comments: { kit: s.comments, indexes: { byTask: s.commentsByTask } },
        activity: { kit: s.activity, indexes: { byTime: s.activityByTime } },
    });
}

export type WorkspaceViews = ReturnType<typeof createWorkspaceViews>;
