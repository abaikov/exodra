import type { TExoSchema } from '@exodra/core';
import { bindable, derive } from '@exodra/reactivity';
import { fromSelector, fromOimdb, keyedChildren } from '@oimdb/exodra';
import type { Status, Task, TaskPriority } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { orderedStatuses } from '../store/workspace-store';
import { sameRows } from '../lib/same-rows';

const PRIORITY_GLYPH: Record<TaskPriority, string> = {
    urgent: '⛌',
    high: '⬆',
    medium: '◆',
    low: '⬇',
};

// --- a single reactive task card -------------------------------------------

// The card's fields are DERIVED from one ref-counted `byPk` bindable: `@oimdb/exodra`
// subscribes to the task's own key only while the card is mounted and tears down on
// unmount (no manual dispose). Field reactivity is thus scoped to THIS task — a change
// to another task never touches this card.
function createCard(taskId: string, statuses: Status[]): TExoSchema {
    const rt = getRuntime();
    const taskB = fromSelector(rt.oimdbInstance.tasks.select.byPk(taskId));

    const title = derive(taskB, t => t?.title ?? '');
    const cls = derive(taskB, t => (t ? cardClass(t) : 'card'));
    const prio = derive(taskB, t => (t ? PRIORITY_GLYPH[t.priority] : ''));
    const assignee = derive(taskB, t => (t ? assigneeName(rt, t) : 'Unassigned'));
    const meta = derive(taskB, t => (t ? metaLine(rt, t) : ''));

    const read = () => rt.oimdbInstance.tasks.collection.getOneByPk(taskId);
    const idxOf = (sid: string) => statuses.findIndex(s => s.id === sid);
    const moveBy = (delta: number) => {
        const t = read();
        if (!t) return;
        const i = idxOf(t.statusId) + delta;
        if (i < 0 || i >= statuses.length) return;
        rt.moveTask(taskId, statuses[i].id);
    };

    return (
        <article bindable={{ class: cls }} static={{ 'data-id': taskId }}>
            <div static={{ class: 'card__top' }}>
                <span static={{ class: 'card__prio' }} bindable={{ textContent: prio }} />
                <span static={{ class: 'card__title' }} bindable={{ textContent: title }} />
                <button
                    static={{ class: 'card__del', 'aria-label': 'Delete task' }}
                    handlers={{ onClick: () => rt.deleteTask(taskId) }}
                >
                    ✕
                </button>
            </div>
            <div static={{ class: 'card__meta' }} bindable={{ textContent: meta }} />
            <div static={{ class: 'card__foot' }}>
                <span static={{ class: 'card__assignee' }} bindable={{ textContent: assignee }} />
                <span static={{ class: 'card__move' }}>
                    <button
                        static={{ class: 'card__btn', 'aria-label': 'Move left' }}
                        handlers={{ onClick: () => moveBy(-1) }}
                    >
                        ◀
                    </button>
                    <button
                        static={{ class: 'card__btn', 'aria-label': 'Move right' }}
                        handlers={{ onClick: () => moveBy(1) }}
                    >
                        ▶
                    </button>
                </span>
            </div>
        </article>
    );
}

function cardClass(t: Task): string {
    return ['card', `card--${t.priority}`, t.pending ? 'card--pending' : '']
        .filter(Boolean)
        .join(' ');
}
function assigneeName(rt: ReturnType<typeof getRuntime>, t: Task): string {
    if (!t.assigneeId) return 'Unassigned';
    return rt.oimdbInstance.members.collection.getOneByPk(t.assigneeId)?.name ?? '—';
}
function metaLine(rt: ReturnType<typeof getRuntime>, t: Task): string {
    const project = rt.oimdbInstance.projects.collection.getOneByPk(t.projectId)?.name ?? '';
    const label = t.labelId
        ? rt.oimdbInstance.labels.collection.getOneByPk(t.labelId)?.name
        : '';
    const tags = t.tagIds
        .map(id => rt.oimdbInstance.tags.collection.getOneByPk(id)?.label)
        .filter(Boolean)
        .map(l => `#${l}`)
        .join(' ');
    return [project, label, tags].filter(Boolean).join(' · ');
}

// --- a status column: identity-stable cards over the column's ordered tasks ---

function createColumn(status: Status, statuses: Status[]): TExoSchema {
    const rt = getRuntime();

    const orderedTasks = (): readonly Task[] =>
        [...rt.oimdbInstance.tasksByStatus.getPksByKey(status.id)]
            .map(pk => rt.oimdbInstance.tasks.collection.getOneByPk(pk))
            .filter((t): t is Task => Boolean(t))
            .sort((a, b) => a.createdAt - b.createdAt);

    // Subscribe to THIS column's status key only (MEMBERSHIP): a move fires exactly
    // the two affected columns, an add/delete fires one, and a field edit that does
    // not change status never fires here — the card's own `byPk` handles the field.
    // `keyedChildren` keeps each card's schema identity-stable, so a move/add/remove
    // only touches the diff and a card that stays keeps its DOM node.
    const ordered = fromOimdb(
        orderedTasks,
        cb => rt.oimdbInstance.tasksByStatus.subscribeOnKey(status.id, cb),
        { equals: sameRows }
    );
    const cards = keyedChildren(ordered, {
        key: t => t.id,
        render: t => createCard(t.id, statuses),
    });
    const count = derive(ordered, list => String(list.length));

    return (
        <section static={{ class: 'col', 'data-status': status.id }}>
            <header static={{ class: 'col__head', style: `--c:${status.color}` }}>
                <span static={{ class: 'col__name' }}>{status.name}</span>
                <span static={{ class: 'col__count' }} bindable={{ textContent: count }} />
            </header>
            <div static={{ class: 'col__body' }} bindable={{ children: cards }} />
        </section>
    );
}

// --- the page ---------------------------------------------------------------

export default function boardPage(): TExoSchema {
    const rt = getRuntime();
    const statuses = orderedStatuses(rt.oimdbInstance);
    const projects = rt.oimdbInstance.projects.collection.getAll().filter(p => !p.archived);

    const newTitle = bindable('');
    const addProject = bindable(projects[0]?.id ?? '');

    const submit = () => {
        const title = newTitle.getValue().trim();
        const projectId = addProject.getValue();
        if (!title || !projectId) return;
        rt.addTask({
            projectId,
            title,
            priority: 'medium',
            statusId: statuses[0]?.id ?? 's-backlog',
            assigneeId: null,
            labelId: null,
            tagIds: [],
            milestoneId: null,
        });
        newTitle.setValue('');
    };

    return (
        <div static={{ class: 'page page--board' }}>
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Board</h1>
                <span static={{ class: 'page__spacer' }} />
                <input
                    static={{
                        class: 'add__input',
                        placeholder: 'New task…',
                        autocomplete: 'off',
                    }}
                    bindable={{ value: newTitle }}
                    handlers={{
                        onInput: e =>
                            newTitle.setValue(e.currentTarget.value),
                        onKeyDown: e => {
                            if (e.key === 'Enter') submit();
                        },
                    }}
                />
                <select
                    bindable={{ value: addProject }}
                    handlers={{
                        onChange: e =>
                            addProject.setValue(e.currentTarget.value),
                    }}
                >
                    {projects.map(p => (
                        <option static={{ value: p.id }}>{p.name}</option>
                    ))}
                </select>
                <button
                    static={{ class: 'btn btn--primary' }}
                    handlers={{ onClick: () => submit() }}
                >
                    Add task
                </button>
            </div>
            <div static={{ class: 'board' }}>{statuses.map(s => createColumn(s, statuses))}</div>
        </div>
    );
}
