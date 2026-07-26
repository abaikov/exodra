import type { TExoSchema } from '@exodra/core';
import { exoSelector } from '@oimdb/exodra';
import { derive } from '@exodra/reactivity';
import { structuralList } from '../lib/structural-list';
import type { Comment, Task } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { orderedStatuses } from '../store/workspace-store';

const PRIORITIES: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];

export default function tasksPage(): TExoSchema {
    const rt = getRuntime();
    const statuses = orderedStatuses(rt.oimdbInstance);
    const members = rt.oimdbInstance.members.collection.getAll();
    const labels = rt.oimdbInstance.labels.collection.getAll();

    // Order lives in the index (createdAt-ordered global array index, maintained
    // incrementally) — the read is a map over the cached ordered pks, never an
    // O(T log T) getAll()+sort on every keystroke-driven flush.
    const allTasks = (): Task[] =>
        rt.oimdbInstance.tasksByCreated
            .getPks()
            .map(pk => rt.oimdbInstance.tasks.collection.getOneByPk(pk))
            .filter((t): t is Task => Boolean(t));

    // Pre-ordered by the index (createdAt) — no per-render sort. Drop holes.
    const commentsOf = (taskId: string): Comment[] =>
        rt.oimdbInstance.comments.collection
            .getManyByPks([...rt.oimdbInstance.commentsByTask.getPksByKey(taskId)])
            .filter((c): c is Comment => Boolean(c));

    // Author name follows the member's own byPk bindable, so a member rename
    // updates it in place — no stale text, no rebuilding the comment row.
    const commentRow = (c: Comment): TExoSchema => {
        const author = derive(
            exoSelector(rt.oimdbInstance.members.select.byPk(c.authorId)),
            m => m?.name ?? '?'
        );
        return (
            <li static={{ class: 'cmt' }}>
                <b static={{ class: 'cmt__author' }} bindable={{ textContent: author }} />
                <span static={{ class: 'cmt__body' }}>{c.body}</span>
            </li>
        );
    };

    const taskRow = (t: Task): TExoSchema => {
        let composer = '';
        return (
            <li
                static={{
                    class: t.pending ? 'trow trow--pending' : 'trow',
                    'data-id': t.id,
                }}
            >
                <div static={{ class: 'trow__main' }}>
                    <input
                        static={{ class: 'trow__title', value: t.title }}
                        handlers={{
                            onInput: e =>
                                rt.editTask(t.id, {
                                    title: e.currentTarget.value,
                                }),
                        }}
                    />
                    <select
                        static={{
                            class: 'trow__status',
                            title: 'Status (moveTask → cnstra → activity)',
                        }}
                        handlers={{
                            onChange: e =>
                                rt.moveTask(
                                    t.id,
                                    e.currentTarget.value
                                ),
                        }}
                    >
                        {statuses.map(s => (
                            <option static={{ value: s.id, selected: s.id === t.statusId }}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <select
                        static={{
                            class: 'trow__assignee',
                            title: 'Assignee (assignTask → cnstra)',
                        }}
                        handlers={{
                            onChange: e => {
                                const v = e.currentTarget.value;
                                rt.assignTask(t.id, v || null);
                            },
                        }}
                    >
                        <option static={{ value: '', selected: !t.assigneeId }}>
                            Unassigned
                        </option>
                        {members.map(m => (
                            <option static={{ value: m.id, selected: m.id === t.assigneeId }}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                    <select
                        static={{ class: 'trow__prio' }}
                        handlers={{
                            onChange: e =>
                                rt.editTask(t.id, {
                                    priority: e.currentTarget.value as Task['priority'],
                                }),
                        }}
                    >
                        {PRIORITIES.map(p => (
                            <option static={{ value: p, selected: p === t.priority }}>
                                {p}
                            </option>
                        ))}
                    </select>
                    <select
                        static={{ class: 'trow__label' }}
                        handlers={{
                            onChange: e => {
                                const v = e.currentTarget.value;
                                rt.editTask(t.id, {
                                    labelId: v || null,
                                });
                            },
                        }}
                    >
                        <option static={{ value: '', selected: !t.labelId }}>
                            no label
                        </option>
                        {labels.map(l => (
                            <option static={{ value: l.id, selected: l.id === t.labelId }}>
                                {l.name}
                            </option>
                        ))}
                    </select>
                    <input
                        static={{
                            class: 'trow__tags',
                            value: t.tagIds.join(', '),
                            title: 'Comma-separated tag ids (setTaskTags → cnstra)',
                        }}
                        handlers={{
                            onChange: e =>
                                rt.setTaskTags(
                                    t.id,
                                    e.currentTarget.value
                                        .split(',')
                                        .map(s => s.trim())
                                        .filter(Boolean)
                                ),
                        }}
                    />
                    <button
                        static={{ class: 'trow__del', 'aria-label': 'Delete task' }}
                        handlers={{ onClick: () => rt.deleteTask(t.id) }}
                    >
                        ✕
                    </button>
                </div>
                <details static={{ class: 'trow__comments' }}>
                    <summary>{`${rt.oimdbInstance.commentsByTask.getPksByKey(t.id).length} comments`}</summary>
                    <ul static={{ class: 'cmts' }}>
                        {commentsOf(t.id).map(commentRow)}
                    </ul>
                    <div static={{ class: 'cmt-add' }}>
                        <input
                            static={{
                                class: 'add__input',
                                placeholder: 'Comment as Ada…',
                            }}
                            handlers={{
                                onInput: e => {
                                    composer = e.currentTarget.value;
                                },
                                onKeyDown: e => {
                                    if (e.key === 'Enter' && composer.trim()) {
                                        rt.addComment(t.id, 'm-ada', composer.trim());
                                        composer = '';
                                        e.currentTarget.value = '';
                                    }
                                },
                            }}
                        />
                    </div>
                </details>
            </li>
        );
    };

    // A task row rebuilds only on a STRUCTURAL change (add/remove/settle, comment
    // count) — editing a title/tags field or a select leaves the key unchanged, so
    // the reconcile is a no-op and input focus is kept.
    // The row key depends on RELATED data (comment count), not just the `tasks`
    // array, so the wrapping bindable forwards every store update and lets
    // `exoChildren` dedup on the rendered key set — gating on the `tasks` array
    // alone would swallow comment add/remove.
    const rows = structuralList(
        allTasks,
        [rt.oimdbInstance.tasks.collection, rt.oimdbInstance.comments.collection],
        t =>
            `${t.id}:${t.pending ? 1 : 0}:${rt.oimdbInstance.commentsByTask.getPksByKey(t.id).length}`,
        taskRow
    );

    return (
        <div static={{ class: 'page page--tasks' }}>
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Tasks</h1>
                <span static={{ class: 'page__hint' }}>
                    edit anything — status/assignee/tags flow through cnstra
                </span>
            </div>
            <ul static={{ class: 'tasklist' }} bindable={{ children: rows }} />
        </div>
    );
}
