// oimdb store for the workspace: one collection per entity plus the derived
// indexes the views read. derivedSetIndex auto-maintains groupings as tasks
// change. API ref: https://abaikov.github.io/oimdb/llms.txt
import {
    OIMEventQueue,
    OIMEventQueueSchedulerFactory,
    createOIMCollectionKit,
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
    const queue = new OIMEventQueue({
        scheduler: OIMEventQueueSchedulerFactory.createMicrotask(),
    });

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
    const tasksByStatus = tasks.indexFactory.derivedSetIndex<string>(
        t => t.statusId
    );
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
    const commentsByTask = comments.indexFactory.derivedSetIndex<string>(
        c => c.taskId
    );

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
        tasksByMilestone,
        tasksByAssignee,
        tasksByTag,
        tasksByLabel,
        membersByTeam,
        milestonesByProject,
        commentsByTask,
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
