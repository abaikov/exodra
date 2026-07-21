import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import type { Status, Task, TaskPriority } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { orderedStatuses } from '../store/workspace-store';
import { keyedList } from '../app/keyed-list';

const PRIORITY_GLYPH: Record<TaskPriority, string> = {
    urgent: '⛌',
    high: '⬆',
    medium: '◆',
    low: '⬇',
};

// --- a single reactive task card -------------------------------------------

interface Card {
    pk: string;
    schema: TExoSchema;
    dispose(): void;
}

function createCard(taskId: string, statuses: Status[]): Card {
    const rt = getRuntime();
    const read = () => rt.store.tasks.collection.getOneByPk(taskId);
    const initial = read();
    if (!initial) throw new Error(`card: missing task ${taskId}`);

    const title = bindable(initial.title);
    const cls = bindable(cardClass(initial));
    const prio = bindable(PRIORITY_GLYPH[initial.priority]);
    const assignee = bindable(assigneeName(rt, initial));
    const meta = bindable(metaLine(rt, initial));

    const idxOf = (sid: string) => statuses.findIndex(s => s.id === sid);
    const moveBy = (delta: number) => {
        const t = read();
        if (!t) return;
        const i = idxOf(t.statusId) + delta;
        if (i < 0 || i >= statuses.length) return;
        rt.moveTask(taskId, statuses[i].id);
    };

    const schema = (
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

    const dispose = rt.store.tasks.collection.subscribeOnKey(taskId, () => {
        const t = read();
        if (!t) return;
        title.setValue(t.title);
        cls.setValue(cardClass(t));
        prio.setValue(PRIORITY_GLYPH[t.priority]);
        assignee.setValue(assigneeName(rt, t));
        meta.setValue(metaLine(rt, t));
    });

    return { pk: taskId, schema, dispose };
}

function cardClass(t: Task): string {
    return ['card', `card--${t.priority}`, t.pending ? 'card--pending' : '']
        .filter(Boolean)
        .join(' ');
}
function assigneeName(rt: ReturnType<typeof getRuntime>, t: Task): string {
    if (!t.assigneeId) return 'Unassigned';
    return rt.store.members.collection.getOneByPk(t.assigneeId)?.name ?? '—';
}
function metaLine(rt: ReturnType<typeof getRuntime>, t: Task): string {
    const project = rt.store.projects.collection.getOneByPk(t.projectId)?.name ?? '';
    const label = t.labelId
        ? rt.store.labels.collection.getOneByPk(t.labelId)?.name
        : '';
    const tags = t.tagIds
        .map(id => rt.store.tags.collection.getOneByPk(id)?.label)
        .filter(Boolean)
        .map(l => `#${l}`)
        .join(' ');
    return [project, label, tags].filter(Boolean).join(' · ');
}

// --- a status column: the shared keyedList over the column's ordered tasks ---

function createColumn(status: Status, statuses: Status[]) {
    const rt = getRuntime();
    const count = bindable('0');

    const orderedTasks = (): Task[] =>
        [...rt.store.tasksByStatus.getPksByKey(status.id)]
            .map(pk => rt.store.tasks.collection.getOneByPk(pk))
            .filter((t): t is Task => Boolean(t))
            .sort((a, b) => a.createdAt - b.createdAt);

    // Each card is a per-key reactive node (its own subscribeOnKey drives field
    // reactivity); keyedList keeps its schema identity-stable, so a field edit is a
    // reconcile no-op (focus kept) and a move/add/remove only touches the diff. A
    // card that leaves the column is disposed via render's { dispose }.
    const col = keyedList({
        items: orderedTasks,
        key: t => t.id,
        render: t => {
            const card = createCard(t.id, statuses);
            return { schema: card.schema, dispose: card.dispose };
        },
    });

    const refresh = () => {
        col.refresh();
        count.setValue(String(col.size()));
    };
    refresh();

    const schema = (
        <section static={{ class: 'col', 'data-status': status.id }}>
            <header static={{ class: 'col__head', style: `--c:${status.color}` }}>
                <span static={{ class: 'col__name' }}>{status.name}</span>
                <span static={{ class: 'col__count' }} bindable={{ textContent: count }} />
            </header>
            <div static={{ class: 'col__body' }} bindable={{ children: col.children }} />
        </section>
    );

    return { schema, refresh, dispose: col.unmount };
}

// --- the page ---------------------------------------------------------------

export default function boardPage(): TExoSchema {
    const rt = getRuntime();
    const statuses = orderedStatuses(rt.store);
    const projects = rt.store.projects.collection.getAll().filter(p => !p.archived);

    const columns = statuses.map(s => createColumn(s, statuses));
    let stop: (() => void) | null = null;

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
        <div
            static={{
                class: 'page page--board',
                onExoMount: () => {
                    stop = rt.store.tasks.collection.subscribeOnAnyUpdate(() =>
                        columns.forEach(c => c.refresh())
                    );
                },
                onExoUnmount: () => {
                    stop?.();
                    stop = null;
                    columns.forEach(c => c.dispose());
                },
            }}
        >
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
                        onInput: (e: Event) =>
                            newTitle.setValue(
                                (e.target as HTMLInputElement).value
                            ),
                        onKeyDown: (e: KeyboardEvent) => {
                            if (e.key === 'Enter') submit();
                        },
                    }}
                />
                <select
                    bindable={{ value: addProject }}
                    handlers={{
                        onChange: (e: Event) =>
                            addProject.setValue(
                                (e.target as HTMLSelectElement).value
                            ),
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
            <div static={{ class: 'board' }}>{columns.map(c => c.schema)}</div>
        </div>
    );
}
