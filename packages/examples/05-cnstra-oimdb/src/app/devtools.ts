import { registry } from '@oimdb/devtools';
import type { WorkspaceStore } from '../store/workspace-store';

// Register the oimdb collections + derived indexes with the devtools registry so
// the @oimdb/mcp server (and the devtools UI) can introspect live store state.
export function registerOimdbDevtools(store: WorkspaceStore) {
    registry.collection('tasks', store.tasks.collection, {
        indexes: {
            byProject: store.tasksByProject,
            byStatus: store.tasksByStatus,
            byAssignee: store.tasksByAssignee,
            byTag: store.tasksByTag,
            byLabel: store.tasksByLabel,
            byMilestone: store.tasksByMilestone,
        },
        relations: {
            projectId: 'projects',
            statusId: 'statuses',
            assigneeId: 'members',
            labelId: 'labels',
            milestoneId: 'milestones',
        },
        description: 'Tasks indexed by project, status, assignee, tag, label',
    });
    registry.collection('projects', store.projects.collection, {
        description: 'Projects',
    });
    registry.collection('milestones', store.milestones.collection, {
        indexes: { byProject: store.milestonesByProject },
        relations: { projectId: 'projects' },
        description: 'Milestones by project',
    });
    registry.collection('members', store.members.collection, {
        indexes: { byTeam: store.membersByTeam },
        relations: { teamId: 'teams' },
        description: 'Members by team',
    });
    registry.collection('teams', store.teams.collection, { description: 'Teams' });
    registry.collection('statuses', store.statuses.collection, {
        description: 'Workflow statuses',
    });
    registry.collection('tags', store.tags.collection, { description: 'Tags' });
    registry.collection('labels', store.labels.collection, {
        description: 'Labels',
    });
    registry.collection('comments', store.comments.collection, {
        indexes: { byTask: store.commentsByTask },
        relations: { taskId: 'tasks', authorId: 'members' },
        description: 'Comments by task',
    });
    registry.collection('activity', store.activity.collection, {
        description: 'Derived audit log',
    });
    return registry;
}
