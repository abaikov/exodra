import type { TExoSchema } from '@exodra/core';
import type { Comment, Task } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { orderedStatuses } from '../store/workspace-store';
import { keyedList } from '../app/keyed-list';

const PRIORITIES: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];

export default function tasksPage(): TExoSchema {
    const rt = getRuntime();
    const statuses = orderedStatuses(rt.store);
    const members = rt.store.members.collection.getAll();
    const labels = rt.store.labels.collection.getAll();

    const allTasks = () =>
        rt.store.tasks.collection
            .getAll()
            .slice()
            .sort((a, b) => a.createdAt - b.createdAt);

    const commentsOf = (taskId: string): Comment[] =>
        rt.store.comments.collection
            .getManyByPks([...rt.store.commentsByTask.getPksByKey(taskId)])
            .sort((a, b) => a.createdAt - b.createdAt);

    const commentRow = (c: Comment): TExoSchema => (
        <li static={{ class: 'cmt' }}>
            <b static={{ class: 'cmt__author' }}>
                {rt.store.members.collection.getOneByPk(c.authorId)?.name ?? '?'}
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
                            onInput: (e: Event) =>
                                rt.patchEntity('tasks', t.id, {
                                    title: (e.target as HTMLInputElement).value,
                                }),
                        }}
                    />
                    <select
                        static={{
                            class: 'trow__status',
                            title: 'Status (moveTask → cnstra → activity)',
                        }}
                        handlers={{
                            onChange: (e: Event) =>
                                rt.moveTask(
                                    t.id,
                                    (e.target as HTMLSelectElement).value
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
                            onChange: (e: Event) => {
                                const v = (e.target as HTMLSelectElement).value;
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
                            onChange: (e: Event) =>
                                rt.patchEntity('tasks', t.id, {
                                    priority: (e.target as HTMLSelectElement).value,
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
                            onChange: (e: Event) => {
                                const v = (e.target as HTMLSelectElement).value;
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
                            onChange: (e: Event) =>
                                rt.setTaskTags(
                                    t.id,
                                    (e.target as HTMLInputElement).value
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
                                onInput: (e: Event) => {
                                    composer = (e.target as HTMLInputElement).value;
                                },
                                onKeyDown: (e: KeyboardEvent) => {
                                    if (e.key === 'Enter' && composer.trim()) {
                                        rt.addComment(t.id, 'm-ada', composer.trim());
                                        composer = '';
                                        (e.target as HTMLInputElement).value = '';
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
    const rows = keyedList({
        items: allTasks,
        key: t => `${t.id}:${t.pending ? 1 : 0}:${commentsOf(t.id).length}`,
        render: taskRow,
        subscribe: refresh => [
            rt.store.tasks.collection.subscribeOnAnyUpdate(refresh),
            rt.store.comments.collection.subscribeOnAnyUpdate(refresh),
        ],
    });

    return (
        <div
            static={{
                class: 'page page--tasks',
                onExoMount: rows.mount,
                onExoUnmount: rows.unmount,
            }}
        >
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Tasks</h1>
                <span static={{ class: 'page__hint' }}>
                    edit anything — status/assignee/tags flow through cnstra
                </span>
            </div>
            <ul static={{ class: 'tasklist' }} bindable={{ children: rows.children }} />
        </div>
    );
}
