import type { TExoSchema } from '@exodra/core';
import { exoSelector } from '@oimdb/exodra';
import { derive } from '@exodra/reactivity';
import type { Task } from '../domain/types';
import { getRuntime } from '../app/runtime';

const PRIORITIES: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];

export default function tasksPage(): TExoSchema {
    const rt = getRuntime();
    const v = rt.views;
    // Statuses have no add-UI in this app, so a snapshot can't go stale; members
    // and labels DO change (People / Tags pages), so their <option> lists must be
    // reactive — a snapshot here would be the classic stale-dropdown bug. Order
    // comes from the index (`byOrder`), never a per-render JS sort.
    const statuses = [...v.statuses.byOrder.unsafeDense().getValue()];

    // One comment row per pk; body + author bind to their own sources (a member
    // rename updates the author in place, no rebuild).
    const commentRow = (comment: ReturnType<typeof v.comments.byPk>): TExoSchema => {
        const authorId = comment.getValue()?.authorId ?? '';
        const author = derive(
            exoSelector(rt.oimdbInstance.members.select.byPk(authorId)),
            m => m?.name ?? '?'
        );
        return (
            <li static={{ class: 'cmt' }}>
                <b static={{ class: 'cmt__author' }} bindable={{ textContent: author }} />
                <span
                    static={{ class: 'cmt__body' }}
                    bindable={{ textContent: derive(comment, c => c?.body ?? '') }}
                />
            </li>
        );
    };

    // One row per TASK (list = createdAt-ordered pks, key = pk). Built ONCE; EVERY
    // field binds to the task's own bindable — pending class, the four <select>
    // values, and the comment count (via the index `.pks`). Editing a field is a
    // reconcile no-op, so focus survives; nothing is folded into a key.
    const taskRow = (
        task: ReturnType<typeof v.tasks.byPk>,
        pk: string
    ): TExoSchema => {
        const cur = task.getValue();
        let composer = '';
        // Reactive <option> lists — follow the collections so they never go stale.
        const assigneeOptions = derive(v.members.all(), ms => [
            <option static={{ value: '' }}>Unassigned</option>,
            ...ms.map(m => <option static={{ value: m.id }}>{m.name}</option>),
        ]);
        const labelOptions = derive(v.labels.all(), ls => [
            <option static={{ value: '' }}>no label</option>,
            ...ls.map(l => <option static={{ value: l.id }}>{l.name}</option>),
        ]);
        return (
            <li
                static={{ 'data-id': pk }}
                bindable={{
                    class: derive(task, t => (t?.pending ? 'trow trow--pending' : 'trow')),
                }}
            >
                <div static={{ class: 'trow__main' }}>
                    <input
                        static={{ class: 'trow__title', value: cur?.title ?? '' }}
                        handlers={{
                            onInput: e => rt.editTask(pk, { title: e.currentTarget.value }),
                        }}
                    />
                    <select
                        static={{
                            class: 'trow__status',
                            title: 'Status (moveTask → cnstra → activity)',
                        }}
                        bindable={{ value: derive(task, t => t?.statusId ?? '') }}
                        handlers={{
                            onChange: e => rt.moveTask(pk, e.currentTarget.value),
                        }}
                    >
                        {statuses.map(s => (
                            <option static={{ value: s.id }}>{s.name}</option>
                        ))}
                    </select>
                    <select
                        static={{
                            class: 'trow__assignee',
                            title: 'Assignee (assignTask → cnstra)',
                        }}
                        bindable={{
                            value: derive(task, t => t?.assigneeId ?? ''),
                            children: assigneeOptions,
                        }}
                        handlers={{
                            onChange: e => rt.assignTask(pk, e.currentTarget.value || null),
                        }}
                    />
                    <select
                        static={{ class: 'trow__prio' }}
                        bindable={{ value: derive(task, t => t?.priority ?? 'medium') }}
                        handlers={{
                            onChange: e =>
                                rt.editTask(pk, {
                                    priority: e.currentTarget.value as Task['priority'],
                                }),
                        }}
                    >
                        {PRIORITIES.map(p => (
                            <option static={{ value: p }}>{p}</option>
                        ))}
                    </select>
                    <select
                        static={{ class: 'trow__label' }}
                        bindable={{
                            value: derive(task, t => t?.labelId ?? ''),
                            children: labelOptions,
                        }}
                        handlers={{
                            onChange: e => rt.editTask(pk, { labelId: e.currentTarget.value || null }),
                        }}
                    />
                    <input
                        static={{
                            class: 'trow__tags',
                            value: (cur?.tagIds ?? []).join(', '),
                            title: 'Comma-separated tag ids (setTaskTags → cnstra)',
                        }}
                        handlers={{
                            onChange: e =>
                                rt.setTaskTags(
                                    pk,
                                    e.currentTarget.value
                                        .split(',')
                                        .map(s => s.trim())
                                        .filter(Boolean)
                                ),
                        }}
                    />
                    <button
                        static={{ class: 'trow__del', 'aria-label': 'Delete task' }}
                        handlers={{ onClick: () => rt.deleteTask(pk) }}
                    >
                        ✕
                    </button>
                </div>
                <details static={{ class: 'trow__comments' }}>
                    <summary
                        bindable={{
                            textContent: derive(
                                v.comments.byTask.pks(pk),
                                c => `${c.length} comments`
                            ),
                        }}
                    />
                    <ul
                        static={{ class: 'cmts' }}
                        bindable={{ children: v.comments.byTask.rows(pk, commentRow) }}
                    />
                    <div static={{ class: 'cmt-add' }}>
                        <input
                            static={{ class: 'add__input', placeholder: 'Comment as Ada…' }}
                            handlers={{
                                onInput: e => {
                                    composer = e.currentTarget.value;
                                },
                                onKeyDown: e => {
                                    if (e.key === 'Enter' && composer.trim()) {
                                        rt.addComment(pk, 'm-ada', composer.trim());
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

    const rows = v.tasks.byCreated.rows(taskRow);

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
