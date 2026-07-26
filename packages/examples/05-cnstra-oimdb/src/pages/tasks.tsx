import type { TExoSchema } from '@exodra/core';
import { fromOimdb, keyedChildren } from '@oimdb/exodra';
import type { Comment, Task } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { orderedStatuses } from '../store/workspace-store';

const PRIORITIES: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];

export default function tasksPage(): TExoSchema {
    const rt = getRuntime();
    const statuses = orderedStatuses(rt.oimdbInstance);
    const members = rt.oimdbInstance.members.collection.getAll();
    const labels = rt.oimdbInstance.labels.collection.getAll();

    const allTasks = () =>
        rt.oimdbInstance.tasks.collection
            .getAll()
            .slice()
            .sort((a, b) => a.createdAt - b.createdAt);

    const commentsOf = (taskId: string): Comment[] =>
        rt.oimdbInstance.comments.collection
            .getManyByPks([...rt.oimdbInstance.commentsByTask.getPksByKey(taskId)])
            .sort((a, b) => a.createdAt - b.createdAt);

    const commentRow = (c: Comment): TExoSchema => (
        <li static={{ class: 'cmt' }}>
            <b static={{ class: 'cmt__author' }}>
                {rt.oimdbInstance.members.collection.getOneByPk(c.authorId)?.name ?? '?'}
            </b>
            <span static={{ class: 'cmt__body' }}>{c.body}</span>
        </li>
    );

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
                                rt.patchEntity('tasks', t.id, {
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
                                rt.patchEntity('tasks', t.id, {
                                    priority: e.currentTarget.value,
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
                                rt.patchEntity('tasks', t.id, {
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
                    <summary>{`${commentsOf(t.id).length} comments`}</summary>
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
    // array, so the wrapping bindable forwards every store update (`alwaysNotify`)
    // and lets `keyedChildren` dedup on the rendered key set — gating on the
    // `tasks` array alone would swallow comment add/remove.
    const rows = keyedChildren(
        fromOimdb(
            allTasks,
            cb => {
                const us = [
                    rt.oimdbInstance.tasks.collection.subscribeOnAnyUpdate(cb),
                    rt.oimdbInstance.comments.collection.subscribeOnAnyUpdate(cb),
                ];
                return () => us.forEach(u => u());
            },
            { alwaysNotify: true }
        ),
        {
            key: t => `${t.id}:${t.pending ? 1 : 0}:${commentsOf(t.id).length}`,
            render: taskRow,
        }
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
