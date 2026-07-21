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
} from './types';

// Deterministic seed (fixed timestamps) so SSR and client hydrate identically.
const T0 = 1_700_000_000_000;
const day = 86_400_000;

const teams: Team[] = [
    { id: 'team-core', name: 'Core', color: '#6366f1' },
    { id: 'team-growth', name: 'Growth', color: '#10b981' },
];

const members: Member[] = [
    { id: 'm-ada', teamId: 'team-core', name: 'Ada', role: 'Lead' },
    { id: 'm-lin', teamId: 'team-core', name: 'Lin', role: 'Engineer' },
    { id: 'm-rex', teamId: 'team-core', name: 'Rex', role: 'Engineer' },
    { id: 'm-mia', teamId: 'team-growth', name: 'Mia', role: 'Designer' },
    { id: 'm-sol', teamId: 'team-growth', name: 'Sol', role: 'PM' },
];

const projects: Project[] = [
    { id: 'p-engine', name: 'Render Engine', description: 'The single-node WeakMap DOM renderer.', color: '#6366f1', leadId: 'm-ada', archived: false },
    { id: 'p-router', name: 'Router & Lazy', description: 'Code-split pages over a shared core.', color: '#0ea5e9', leadId: 'm-lin', archived: false },
    { id: 'p-site', name: 'Marketing Site', description: 'Docs and landing.', color: '#10b981', leadId: 'm-sol', archived: false },
];

const milestones: Milestone[] = [
    { id: 'ms-1', projectId: 'p-engine', title: 'v0.2 perf pass', dueAt: T0 + 14 * day, done: false },
    { id: 'ms-2', projectId: 'p-engine', title: 'v0.3 hydration', dueAt: T0 + 40 * day, done: false },
    { id: 'ms-3', projectId: 'p-router', title: 'lazy routes', dueAt: T0 + 20 * day, done: false },
    { id: 'ms-4', projectId: 'p-site', title: 'launch', dueAt: T0 + 30 * day, done: false },
];

const statuses: Status[] = [
    { id: 's-backlog', name: 'Backlog', order: 0, color: '#94a3b8' },
    { id: 's-todo', name: 'To do', order: 1, color: '#3b82f6' },
    { id: 's-doing', name: 'In progress', order: 2, color: '#f59e0b' },
    { id: 's-review', name: 'Review', order: 3, color: '#a855f7' },
    { id: 's-done', name: 'Done', order: 4, color: '#10b981' },
];

const tags: Tag[] = [
    { id: 't-perf', label: 'perf', color: '#ef4444' },
    { id: 't-dx', label: 'dx', color: '#8b5cf6' },
    { id: 't-a11y', label: 'a11y', color: '#06b6d4' },
    { id: 't-ssr', label: 'ssr', color: '#f97316' },
    { id: 't-docs', label: 'docs', color: '#22c55e' },
];

const labels: Label[] = [
    { id: 'l-bug', name: 'bug', color: '#ef4444' },
    { id: 'l-feature', name: 'feature', color: '#3b82f6' },
    { id: 'l-chore', name: 'chore', color: '#94a3b8' },
];

const T = (
    id: string,
    projectId: string,
    title: string,
    statusId: string,
    priority: Task['priority'],
    opts: Partial<Task> = {}
): Task => ({
    id,
    projectId,
    milestoneId: opts.milestoneId ?? null,
    title,
    statusId,
    labelId: opts.labelId ?? null,
    assigneeId: opts.assigneeId ?? null,
    tagIds: opts.tagIds ?? [],
    priority,
    createdAt: opts.createdAt ?? T0,
});

const tasks: Task[] = [
    T('tk-1', 'p-engine', 'Lazy disposers in setupBindings', 's-done', 'high', { milestoneId: 'ms-1', labelId: 'l-feature', assigneeId: 'm-ada', tagIds: ['t-perf'], createdAt: T0 + 1 * day }),
    T('tk-2', 'p-engine', 'reorder via nextSibling', 's-done', 'medium', { milestoneId: 'ms-1', labelId: 'l-feature', assigneeId: 'm-lin', tagIds: ['t-perf'], createdAt: T0 + 2 * day }),
    T('tk-3', 'p-engine', 'setValue dedupe', 's-doing', 'urgent', { milestoneId: 'ms-1', labelId: 'l-feature', assigneeId: 'm-ada', tagIds: ['t-perf', 't-dx'], createdAt: T0 + 3 * day }),
    T('tk-4', 'p-engine', 'component context single alloc', 's-review', 'high', { milestoneId: 'ms-1', labelId: 'l-bug', assigneeId: 'm-rex', tagIds: ['t-perf'], createdAt: T0 + 4 * day }),
    T('tk-5', 'p-engine', 'hydration parity', 's-todo', 'medium', { milestoneId: 'ms-2', labelId: 'l-feature', assigneeId: 'm-lin', tagIds: ['t-ssr'], createdAt: T0 + 5 * day }),
    T('tk-6', 'p-router', 'lazy() loader resolve', 's-doing', 'high', { milestoneId: 'ms-3', labelId: 'l-feature', assigneeId: 'm-lin', tagIds: ['t-dx'], createdAt: T0 + 6 * day }),
    T('tk-7', 'p-router', 'preloadRoute on hover', 's-todo', 'low', { milestoneId: 'ms-3', labelId: 'l-feature', assigneeId: 'm-rex', tagIds: ['t-dx'], createdAt: T0 + 7 * day }),
    T('tk-8', 'p-router', 'bundle-size budget', 's-backlog', 'medium', { milestoneId: 'ms-3', labelId: 'l-chore', tagIds: ['t-perf'], createdAt: T0 + 8 * day }),
    T('tk-9', 'p-site', 'a11y audit', 's-todo', 'high', { milestoneId: 'ms-4', labelId: 'l-bug', assigneeId: 'm-mia', tagIds: ['t-a11y'], createdAt: T0 + 9 * day }),
    T('tk-10', 'p-site', 'docs blog: node identity', 's-doing', 'medium', { milestoneId: 'ms-4', labelId: 'l-chore', assigneeId: 'm-sol', tagIds: ['t-docs'], createdAt: T0 + 10 * day }),
    T('tk-11', 'p-site', 'landing hero', 's-review', 'low', { milestoneId: 'ms-4', labelId: 'l-feature', assigneeId: 'm-mia', tagIds: ['t-docs'], createdAt: T0 + 11 * day }),
    T('tk-12', 'p-site', 'OG images', 's-backlog', 'low', { milestoneId: 'ms-4', labelId: 'l-chore', tagIds: ['t-docs'], createdAt: T0 + 12 * day }),
];

const comments: Comment[] = [
    { id: 'c-1', taskId: 'tk-3', authorId: 'm-lin', body: 'guarded by event === undefined', createdAt: T0 + 3 * day + 3600_000 },
    { id: 'c-2', taskId: 'tk-3', authorId: 'm-ada', body: 'recompute went 1.5ms -> 0.005ms', createdAt: T0 + 3 * day + 7200_000 },
    { id: 'c-3', taskId: 'tk-6', authorId: 'm-rex', body: 'isLazyLoader already exists in router', createdAt: T0 + 6 * day + 3600_000 },
];

const activity: Activity[] = [
    { id: 'a-1', kind: 'task.created', summary: 'Ada created "Lazy disposers"', entityId: 'tk-1', actorId: 'm-ada', at: T0 + 1 * day },
    { id: 'a-2', kind: 'task.moved', summary: 'setValue dedupe -> In progress', entityId: 'tk-3', actorId: 'm-ada', at: T0 + 3 * day + 1000 },
    { id: 'a-3', kind: 'comment.added', summary: 'Lin commented on "setValue dedupe"', entityId: 'tk-3', actorId: 'm-lin', at: T0 + 3 * day + 3600_000 },
];

export function createSeed(): WorkspaceSnapshot {
    return { teams, members, projects, milestones, statuses, tags, labels, tasks, comments, activity };
}
