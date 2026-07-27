import type { TExoSchema } from '@exodra/core';
import { derive } from '@exodra/reactivity';
import { exoRows, exoCombine } from '@oimdb/exodra';
import { getRuntime } from '../app/runtime';

export default function projectsPage(): TExoSchema {
    const rt = getRuntime();
    const v = rt.views;

    const leadName = (id: string) =>
        rt.oimdbInstance.members.collection.getOneByPk(id)?.name ?? '—';

    // One card per PROJECT (list = project pks, key = pk). Built ONCE; every field
    // that can change binds to the project's own bindable (archived class, color,
    // lead) or to a related index (task count via `.pks`, milestones via nested
    // `.rows`). Nothing folded into a key → a name/description edit is a no-op and
    // keeps focus.
    const card = (projectPk: string): TExoSchema => {
        const project = v.projects.byPk(projectPk);
        const cur = project.getValue();

        const milestones = v.milestones.byProject.rows(projectPk, (m, mpk) => {
            const mc = m.getValue();
            return (
                <li static={{ class: 'ms', 'data-id': mpk }}>
                    <input
                        static={{ class: 'ms__title', value: mc?.title ?? '' }}
                        handlers={{
                            onInput: e =>
                                rt.patchEntity('milestones', mpk, { title: e.currentTarget.value }),
                        }}
                    />
                    <button
                        static={{ class: 'ms__done' }}
                        bindable={{ textContent: derive(m, x => (x?.done ? '✓ done' : 'mark done')) }}
                        handlers={{
                            onClick: () =>
                                rt.patchEntity('milestones', mpk, { done: !m.getValue()?.done }),
                        }}
                    />
                </li>
            );
        });

        return (
            <section
                static={{ 'data-id': projectPk }}
                bindable={{
                    class: derive(project, p =>
                        p?.archived ? 'projcard projcard--archived' : 'projcard'
                    ),
                }}
            >
                <header
                    static={{ class: 'projcard__head' }}
                    bindable={{ style: derive(project, p => `--c:${p?.color ?? ''}`) }}
                >
                    <input
                        static={{ class: 'projcard__name', value: cur?.name ?? '' }}
                        handlers={{
                            onInput: e =>
                                rt.patchEntity('projects', projectPk, { name: e.currentTarget.value }),
                        }}
                    />
                    <span
                        static={{ class: 'projcard__count' }}
                        bindable={{
                            textContent: derive(
                                v.tasks.byProject.pks(projectPk),
                                t => `${t.length} tasks`
                            ),
                        }}
                    />
                </header>
                <textarea
                    static={{ class: 'projcard__desc' }}
                    handlers={{
                        onInput: e =>
                            rt.patchEntity('projects', projectPk, {
                                description: e.currentTarget.value,
                            }),
                    }}
                >
                    {cur?.description ?? ''}
                </textarea>
                <div
                    static={{ class: 'projcard__lead' }}
                    bindable={{
                        // Follows BOTH the project (leadId can change) and the
                        // members collection (the lead's name can change).
                        textContent: exoCombine([project, v.members.all()], () =>
                            `Lead: ${leadName(project.getValue()?.leadId ?? '')}`
                        ),
                    }}
                />
                <ul static={{ class: 'ms-list' }} bindable={{ children: milestones }} />
                <div static={{ class: 'projcard__foot' }}>
                    <button
                        static={{
                            class: 'btn btn--danger',
                            title: 'Archive project — cascades through cnstra, deleting its tasks + comments',
                        }}
                        handlers={{ onClick: () => rt.archiveProject(projectPk) }}
                    >
                        Archive (cascade)
                    </button>
                </div>
            </section>
        );
    };

    const grid = exoRows(v.projects.allPks(), card);

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
