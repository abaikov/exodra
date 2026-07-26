import type { TExoSchema } from '@exodra/core';
import { structuralList } from '../lib/structural-list';
import type { Milestone, Project } from '../domain/types';
import { getRuntime } from '../app/runtime';

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
                    onInput: e =>
                        rt.patchEntity('milestones', m.id, {
                            title: e.currentTarget.value,
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
                        onInput: e =>
                            rt.patchEntity('projects', p.id, {
                                name: e.currentTarget.value,
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
                    onInput: e =>
                        rt.patchEntity('projects', p.id, {
                            description: e.currentTarget.value,
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
    // The card key depends on RELATED data (task count, milestones), not just the
    // `projects` array, so the wrapping bindable forwards every store update and
    // lets `exoChildren` dedup on the rendered key set — gating on the `projects`
    // array alone would swallow task/milestone changes.
    const grid = structuralList(
        projects,
        [
            rt.oimdbInstance.projects.collection,
            rt.oimdbInstance.milestones.collection,
            rt.oimdbInstance.tasks.collection,
        ],
        p =>
            `${p.id}:${p.archived ? 1 : 0}:${taskCount(p.id)}:${milestonesOf(p.id)
                .map(m => m.id + (m.done ? 'd' : ''))
                .join('+')}`,
        card
    );

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
        <div static={{ class: 'page page--projects' }}>
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
            <div static={{ class: 'projgrid' }} bindable={{ children: grid }} />
        </div>
    );
}
