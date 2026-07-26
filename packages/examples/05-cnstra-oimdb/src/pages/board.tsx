import type { TExoSchema } from '@exodra/core';
import { bindable, derive } from '@exodra/reactivity';
import { exoSelector, exoSource, exoCombine, exoList } from '@oimdb/exodra';
import type { Status, Task, TaskPriority } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { orderedStatuses } from '../store/workspace-store';

const PRIORITY_GLYPH: Record<TaskPriority, string> = {
    urgent: '⛌',
    high: '⬆',
    medium: '◆',
    low: '⬇',
};

// --- a single reactive task card -------------------------------------------

// Page-scoped "ticks": one ref-counted bindable per RELATED collection, shared by
// every card. `assignee`/`meta` name OTHER entities (members/projects/labels/tags),
// so a task-only `derive` would show a STALE name when the referenced entity is
// renamed without touching the task. Combining the task bindable with these ticks
// via `exoCombine` re-derives the text on either a task OR a referenced-entity
// change — one collection subscription total per tick, not one per card.
type Tick = ReturnType<typeof exoSource>;
type BoardTicks = { members: Tick; meta: Tick };

function makeTicks(rt: ReturnType<typeof getRuntime>): BoardTicks {
    const tick = (...cols: { subscribeOnAnyUpdate(cb: () => void): () => void }[]): Tick =>
        exoSource(
            () => 0,
            cb => {
                const us = cols.map(c => c.subscribeOnAnyUpdate(cb));
                return () => us.forEach(u => u());
            }
        );
    const o = rt.oimdbInstance;
    return {
        members: tick(o.members.collection),
        meta: tick(o.projects.collection, o.labels.collection, o.tags.collection),
    };
}

// The card's task-only fields (title/class/priority) derive from ONE ref-counted
// `byPk` bindable — reactivity scoped to THIS task. Cross-entity fields
// (assignee/meta) additionally follow the shared ticks so they never go stale.
function createCard(taskId: string, statuses: Status[], ticks: BoardTicks): TExoSchema {
    const rt = getRuntime();
    const taskB = exoSelector(rt.oimdbInstance.tasks.select.byPk(taskId));

    const title = derive(taskB, t => t?.title ?? '');
    const cls = derive(taskB, t => (t ? cardClass(t) : 'card'));
    const prio = derive(taskB, t => (t ? PRIORITY_GLYPH[t.priority] : ''));
    const assignee = exoCombine([taskB, ticks.members], () => {
        const t = taskB.getValue();
        return t ? assigneeName(rt, t) : 'Unassigned';
    });
    const meta = exoCombine([taskB, ticks.meta], () => {
        const t = taskB.getValue();
        return t ? metaLine(rt, t) : '';
    });

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

function createColumn(status: Status, statuses: Status[], ticks: BoardTicks): TExoSchema {
    const rt = getRuntime();

    // O(delta) column: the ordered index (sorted by createdAt) feeds a command
    // stream, and `exoList` forwards its insert/move/remove ops straight to the
    // DOM — a move RELOCATES the existing card node (keeps its state), only the
    // touched rows change, nothing re-sorts on read. Each card drives its own
    // fields from a `byPk` bindable, so a field edit needs no list command at all.
    const cards = exoList(
        rt.oimdbInstance.tasksByStatusStream,
        status.id,
        slot => createCard(slot.pk, statuses, ticks)
    );
    // Count tracks membership only (the status key), independent of the card ops.
    const count = derive(
        exoSource(
            () => rt.oimdbInstance.tasksByStatus.getPksByKey(status.id).length,
            cb => rt.oimdbInstance.tasksByStatus.subscribeOnKey(status.id, cb)
        ),
        n => String(n)
    );

    return (
        <section static={{ class: 'col', 'data-status': status.id }}>
            <header static={{ class: 'col__head', style: `--c:${status.color}` }}>
                <span static={{ class: 'col__name' }}>{status.name}</span>
                <span static={{ class: 'col__count' }} bindable={{ textContent: count }} />
            </header>
            <div static={{ class: 'col__body' }} bindableList={{ children: cards }} />
        </section>
    );
}

// --- the page ---------------------------------------------------------------

export default function boardPage(): TExoSchema {
    const rt = getRuntime();
    const statuses = orderedStatuses(rt.oimdbInstance);
    const ticks = makeTicks(rt);
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
            <div static={{ class: 'board' }}>{statuses.map(s => createColumn(s, statuses, ticks))}</div>
        </div>
    );
}
