import type { TExoSchema } from '@exodra/core';
import type { Milestone, Project } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { keyedList } from '../app/keyed-list';

export default function projectsPage(): TExoSchema {
    const rt = getRuntime();

    const projects = () => rt.oimdbInstance.projects.collection.getAll();
    const milestonesOf = (projectId: string): Milestone[] =>
        rt.oimdbInstance.milestones.collection.getManyByPks([
            ...rt.oimdbInstance.milestonesByProject.getPksByKey(projectId),
        ]);
    const taskCount = (projectId: string) =>
        rt.oimdbInstance.tasksByProject.getPksByKey(projectId).size;
    const leadName = (id: string) =>
        rt.oimdbInstance.members.collection.getOneByPk(id)?.name ?? '—';

    const milestoneRow = (m: Milestone): TExoSchema => (
        <li static={{ class: 'ms', 'data-id': m.id }}>
            <input
                static={{ class: 'ms__title', value: m.title }}
                handlers={{
                    onInput: (e: Event) =>
                        rt.patchEntity('milestones', m.id, {
                            title: (e.target as HTMLInputElement).value,
                        }),
                }}
            />
            <button
                static={{ class: 'ms__done' }}
                handlers={{
                    onClick: () =>
                        rt.patchEntity('milestones', m.id, { done: !m.done }),
                }}
            >
                {m.done ? '✓ done' : 'mark done'}
            </button>
        </li>
    );

    const card = (p: Project): TExoSchema => (
        <section
            static={{
                class: p.archived ? 'projcard projcard--archived' : 'projcard',
                'data-id': p.id,
            }}
        >
            <header static={{ class: 'projcard__head', style: `--c:${p.color}` }}>
                <input
                    static={{ class: 'projcard__name', value: p.name }}
                    handlers={{
                        onInput: (e: Event) =>
                            rt.patchEntity('projects', p.id, {
                                name: (e.target as HTMLInputElement).value,
                            }),
                    }}
                />
                <span static={{ class: 'projcard__count' }}>
                    {`${taskCount(p.id)} tasks`}
                </span>
            </header>
            <textarea
                static={{ class: 'projcard__desc' }}
                handlers={{
                    onInput: (e: Event) =>
                        rt.patchEntity('projects', p.id, {
                            description: (e.target as HTMLTextAreaElement).value,
                        }),
                }}
            >
                {p.description}
            </textarea>
            <div static={{ class: 'projcard__lead' }}>
                {`Lead: ${leadName(p.leadId)}`}
            </div>
            <ul static={{ class: 'ms-list' }}>{milestonesOf(p.id).map(milestoneRow)}</ul>
            <div static={{ class: 'projcard__foot' }}>
                <button
                    static={{
                        class: 'btn btn--danger',
                        title: 'Archive project — cascades through cnstra, deleting its tasks + comments',
                    }}
                    handlers={{ onClick: () => rt.archiveProject(p.id) }}
                >
                    Archive (cascade)
                </button>
            </div>
        </section>
    );

    // A project card rebuilds only when its STRUCTURE changes (archive, task-count,
    // milestone add/remove/done) — a name/description edit leaves the key unchanged,
    // so the reconcile is a no-op and the focused input keeps focus.
    const grid = keyedList({
        items: projects,
        key: p =>
            `${p.id}:${p.archived ? 1 : 0}:${taskCount(p.id)}:${milestonesOf(p.id)
                .map(m => m.id + (m.done ? 'd' : ''))
                .join('+')}`,
        render: card,
        subscribe: refresh => [
            rt.oimdbInstance.projects.collection.subscribeOnAnyUpdate(refresh),
            rt.oimdbInstance.milestones.collection.subscribeOnAnyUpdate(refresh),
            rt.oimdbInstance.tasks.collection.subscribeOnAnyUpdate(refresh),
        ],
    });

    const addProject = () =>
        rt.createEntity('projects', {
            id: `p-${Date.now()}`,
            name: 'New project',
            description: '',
            color: '#6366f1',
            leadId: rt.oimdbInstance.members.collection.getAll()[0]?.id ?? '',
            archived: false,
        });

    return (
        <div
            static={{
                class: 'page page--projects',
                onExoMount: grid.mount,
                onExoUnmount: grid.unmount,
            }}
        >
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Projects</h1>
                <span static={{ class: 'page__spacer' }} />
                <button
                    static={{ class: 'btn btn--primary' }}
                    handlers={{ onClick: () => addProject() }}
                >
                    + project
                </button>
            </div>
            <div static={{ class: 'projgrid' }} bindable={{ children: grid.children }} />
        </div>
    );
}
