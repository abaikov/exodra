import { collateral } from '@cnstra/core';
import type { TaskPriority } from '../domain/types';

// ---------------------------------------------------------------------------
// Collaterals = the typed channels that wire the workspace CNS together.
// Commands are entry points (stimulated from the UI); events are emitted by the
// domain neurons during the deterministic traversal and consumed downstream
// (persist saga, settle, activity log). Defining them here keeps every neuron
// depending on the SAME channel objects.
// ---------------------------------------------------------------------------

export interface AddTaskCommand {
    projectId: string;
    title: string;
    priority: TaskPriority;
    statusId: string;
    assigneeId: string | null;
    labelId: string | null;
    tagIds: readonly string[];
    milestoneId: string | null;
}

// Commands (UI → CNS)
export const addTaskRequested = collateral<AddTaskCommand>();
export const moveTaskRequested = collateral<{ id: string; statusId: string }>();
export const assignTaskRequested = collateral<{ id: string; assigneeId: string | null }>();
export const setTaskTagsRequested = collateral<{ id: string; tagIds: readonly string[] }>();
export const deleteTaskRequested = collateral<{ id: string }>();
export const addCommentRequested = collateral<{ taskId: string; authorId: string; body: string }>();
export const archiveProjectRequested = collateral<{ id: string }>();

// Events (emitted during traversal; the activity neuron listens to all of them)
export const taskAdded = collateral<{ id: string; title: string; actorId: string | null }>();
export const taskMoved = collateral<{ id: string; statusId: string; title: string }>();
export const taskAssigned = collateral<{ id: string; assigneeId: string | null; title: string }>();
export const taskTagged = collateral<{ id: string; title: string }>();
export const taskDeleted = collateral<{ id: string; title: string }>();
export const commentAdded = collateral<{ taskId: string; authorId: string }>();
export const projectArchived = collateral<{ id: string; name: string; removed: number }>();
export const taskPersisted = collateral<{ id: string }>();
export const taskPersistFailed = collateral<{ id: string; reason: string }>();
export const activityLogged = collateral<{ id: string }>();

// Rejections — one collateral PER emitter (a collateral belongs to exactly one
// neuron's axon). A consumer that cares about all of them takes them as an array
// (`dendrite({ collateral: [taskRejected, commentRejected, taskPersistRejected] })`),
// or, as the runtime does here, checks membership on the response.
export type CommandRejection = { command: string; reason: string };
export const taskRejected = collateral<CommandRejection>(); // task neuron
export const commentRejected = collateral<CommandRejection>(); // comment neuron
export const taskPersistRejected = collateral<CommandRejection>(); // settle neuron (rollback)
