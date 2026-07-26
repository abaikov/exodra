// oimdb store for the workspace: one collection per entity plus the derived
// indexes the views read. derivedSetIndex auto-maintains groupings as tasks
// change. API ref: https://abaikov.github.io/oimdb/llms.txt
import {
    OIMEventQueue,
    createOIMCollectionKit,
    createOIMOrderedListCommandStreamDiffDriven,
} from '@oimdb/core';
import type {
    Activity,
    Comment,
    Label,
    Member,
    Milestone,
    Project,
    Status,
    Tag,
    Task,
    Team,
    WorkspaceSnapshot,
} from '../domain/types';

export function createWorkspaceStore() {
    // NO scheduler → the queue never flushes itself. Every mutation goes through
    // the CNS, and `cns.addDrainListener(() => queue.flush())` (see runtime.ts) is
    // the single point where the store commits — one synchronous flush per settled
    // stimulation. Collection/index data is maintained on write, so the initial
    // (and SSR) render reads correct data without a flush; the flush only drives
    // subscriber notifications, which only matter after a mutation.
    const queue = new OIMEventQueue();

    const kit = <T extends { id: string }>() =>
        createOIMCollectionKit<T, string>(queue, { selectPk: e => e.id });

    const teams = kit<Team>();
    const members = kit<Member>();
    const projects = kit<Project>();
    const milestones = kit<Milestone>();
    const statuses = kit<Status>();
    const tags = kit<Tag>();
    const labels = kit<Label>();
    const tasks = kit<Task>();
    const comments = kit<Comment>();
    const activity = kit<Activity>();

    // Derived indexes — recompute automatically when the backing entity changes.
    const tasksByProject = tasks.indexFactory.derivedSetIndex<string>(
        t => t.projectId
    );
    // Board column: ORDER lives in the index (incremental), never re-sorted on
    // read. `orderBy` keeps each status key sorted by createdAt as tasks change,
    // and the array-based index unlocks the O(delta) command stream below.
    const tasksByStatus = tasks.indexFactory.derivedArrayIndex<string>(
        t => t.statusId,
        { orderBy: t => t.createdAt }
    );
    // Diff-driven ordered-list stream over the ordered index: per-key membership
    // and reorder become position-addressed insert/move/remove commands, which
    // `exoList` forwards 1:1 to the DOM (moved rows relocate, they don't rebuild).
    const tasksByStatusStream =
        createOIMOrderedListCommandStreamDiffDriven(queue, tasksByStatus);

    // Whole-collection createdAt order for the Tasks page, maintained incrementally
    // — the list read is a map over cached ordered pks, not a getAll()+sort per flush.
    const tasksByCreated = tasks.indexFactory.derivedArrayGlobalIndex({
        orderBy: t => t.createdAt,
    });
    const tasksByMilestone = tasks.indexFactory.derivedSetIndex<string>(t =>
        t.milestoneId ? [t.milestoneId] : []
    );
    const tasksByAssignee = tasks.indexFactory.derivedSetIndex<string>(t =>
        t.assigneeId ? [t.assigneeId] : []
    );
    const tasksByTag = tasks.indexFactory.derivedSetIndex<string>(
        t => t.tagIds
    );
    const tasksByLabel = tasks.indexFactory.derivedSetIndex<string>(t =>
        t.labelId ? [t.labelId] : []
    );
    const membersByTeam = members.indexFactory.derivedSetIndex<string>(
        m => m.teamId
    );
    const milestonesByProject = milestones.indexFactory.derivedSetIndex<string>(
        m => m.projectId
    );
    // Ordered by createdAt so the Tasks page reads a pre-sorted comment list
    // (no per-render JS sort); membership count stays O(1) via `.length`.
    const commentsByTask = comments.indexFactory.derivedArrayIndex<string>(
        c => c.taskId,
        { orderBy: c => c.createdAt }
    );
    // Newest-first activity feed: order by -at (ascending of -at = descending at),
    // maintained incrementally so an append is one insert, not a re-sort.
    const activityByTime = activity.indexFactory.derivedArrayGlobalIndex({
        orderBy: a => -a.at,
    });

    return {
        queue,
        teams,
        members,
        projects,
        milestones,
        statuses,
        tags,
        labels,
        tasks,
        comments,
        activity,
        tasksByProject,
        tasksByStatus,
        tasksByStatusStream,
        tasksByCreated,
        tasksByMilestone,
        tasksByAssignee,
        tasksByTag,
        tasksByLabel,
        membersByTeam,
        milestonesByProject,
        commentsByTask,
        activityByTime,
    };
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;

const COLLECTIONS: readonly (keyof WorkspaceSnapshot)[] = [
    'teams',
    'members',
    'projects',
    'milestones',
    'statuses',
    'tags',
    'labels',
    'tasks',
    'comments',
    'activity',
];

export function loadSnapshot(
    oimdbInstance: WorkspaceStore,
    snapshot: WorkspaceSnapshot
): void {
    for (const name of COLLECTIONS) {
        const col = oimdbInstance[name].collection;
        col.clear();
        col.upsertMany([...snapshot[name]] as never[]);
    }
}

export function takeSnapshot(oimdbInstance: WorkspaceStore): WorkspaceSnapshot {
    return {
        teams: oimdbInstance.teams.collection.getAll(),
        members: oimdbInstance.members.collection.getAll(),
        projects: oimdbInstance.projects.collection.getAll(),
        milestones: oimdbInstance.milestones.collection.getAll(),
        statuses: oimdbInstance.statuses.collection.getAll(),
        tags: oimdbInstance.tags.collection.getAll(),
        labels: oimdbInstance.labels.collection.getAll(),
        tasks: oimdbInstance.tasks.collection.getAll(),
        comments: oimdbInstance.comments.collection.getAll(),
        activity: oimdbInstance.activity.collection.getAll(),
    };
}

// --- read helpers used across pages -----------------------------------------

export function orderedStatuses(oimdbInstance: WorkspaceStore): Status[] {
    return oimdbInstance.statuses.collection.getAll().slice().sort((a, b) => a.order - b.order);
}
