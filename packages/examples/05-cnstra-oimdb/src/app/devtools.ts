import { registry } from '@oimdb/devtools';
import type { WorkspaceStore } from '../store/workspace-store';

// Register the oimdb collections + derived indexes with the devtools registry so
// the @oimdb/mcp server (and the devtools UI) can introspect live store state.
export function registerOimdbDevtools(oimdbInstance: WorkspaceStore) {
    registry.collection('tasks', oimdbInstance.tasks.collection, {
        indexes: {
            byProject: oimdbInstance.tasksByProject,
            byStatus: oimdbInstance.tasksByStatus,
            byAssignee: oimdbInstance.tasksByAssignee,
            byTag: oimdbInstance.tasksByTag,
            byLabel: oimdbInstance.tasksByLabel,
            byMilestone: oimdbInstance.tasksByMilestone,
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
    registry.collection('projects', oimdbInstance.projects.collection, {
        description: 'Projects',
    });
    registry.collection('milestones', oimdbInstance.milestones.collection, {
        indexes: { byProject: oimdbInstance.milestonesByProject },
        relations: { projectId: 'projects' },
        description: 'Milestones by project',
    });
    registry.collection('members', oimdbInstance.members.collection, {
        indexes: { byTeam: oimdbInstance.membersByTeam },
        relations: { teamId: 'teams' },
        description: 'Members by team',
    });
    registry.collection('teams', oimdbInstance.teams.collection, { description: 'Teams' });
    registry.collection('statuses', oimdbInstance.statuses.collection, {
        description: 'Workflow statuses',
    });
    registry.collection('tags', oimdbInstance.tags.collection, { description: 'Tags' });
    registry.collection('labels', oimdbInstance.labels.collection, {
        description: 'Labels',
    });
    registry.collection('comments', oimdbInstance.comments.collection, {
        indexes: { byTask: oimdbInstance.commentsByTask },
        relations: { taskId: 'tasks', authorId: 'members' },
        description: 'Comments by task',
    });
    registry.collection('activity', oimdbInstance.activity.collection, {
        description: 'Derived audit log',
    });
    return registry;
}
