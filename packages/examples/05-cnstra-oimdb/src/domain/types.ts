// Domain model for the Exodra workspace showcase. ~10 related entities with full
// editing, orchestrated by cnstra over an oimdb store and rendered by Exodra.
// These are application-level types (not Exodra framework types).

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// --- entities ---------------------------------------------------------------

export interface Team {
    id: string;
    name: string;
    color: string;
}

export interface Member {
    id: string;
    teamId: string;
    name: string;
    role: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    color: string;
    leadId: string; // Member.id
    archived: boolean;
}

export interface Milestone {
    id: string;
    projectId: string;
    title: string;
    dueAt: number;
    done: boolean;
}

// A workflow status column (Backlog / In progress / Review / Done …). Ordered.
export interface Status {
    id: string;
    name: string;
    order: number;
    color: string;
}

// Freeform tag (many-to-many with tasks via Task.tagIds).
export interface Tag {
    id: string;
    label: string;
    color: string;
}

// Categorical label (bug / feature / chore …) — one per task.
export interface Label {
    id: string;
    name: string;
    color: string;
}

export interface Task {
    id: string;
    projectId: string;
    milestoneId: string | null;
    title: string;
    statusId: string;
    labelId: string | null;
    assigneeId: string | null;
    tagIds: readonly string[];
    priority: TaskPriority;
    createdAt: number;
    // Optimistic-add flag: true while the cnstra saga "persists" it.
    pending?: boolean;
}

export interface Comment {
    id: string;
    taskId: string;
    authorId: string; // Member.id
    body: string;
    createdAt: number;
}

// Derived audit log — appended by the CNS as commands settle. Read-only in the UI.
export type ActivityKind =
    | 'task.created'
    | 'task.moved'
    | 'task.assigned'
    | 'task.tagged'
    | 'task.deleted'
    | 'comment.added'
    | 'project.archived';

export interface Activity {
    id: string;
    kind: ActivityKind;
    summary: string;
    entityId: string;
    actorId: string | null;
    at: number;
}

// --- the 10 collections, by key ---------------------------------------------

export type EntityName =
    | 'teams'
    | 'members'
    | 'projects'
    | 'milestones'
    | 'statuses'
    | 'tags'
    | 'labels'
    | 'tasks'
    | 'comments'
    | 'activity';

export interface WorkspaceSnapshot {
    teams: readonly Team[];
    members: readonly Member[];
    projects: readonly Project[];
    milestones: readonly Milestone[];
    statuses: readonly Status[];
    tags: readonly Tag[];
    labels: readonly Label[];
    tasks: readonly Task[];
    comments: readonly Comment[];
    activity: readonly Activity[];
}
