import type { TExoSchema } from '@exodra/core';
import type { Member, Team } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { keyedList } from '../lib/keyed-list';

export default function peoplePage(): TExoSchema {
    const rt = getRuntime();

    const teams = () => rt.oimdbInstance.teams.collection.getAll();
    const membersOf = (teamId: string): Member[] =>
        rt.oimdbInstance.members.collection.getManyByPks([
            ...rt.oimdbInstance.membersByTeam.getPksByKey(teamId),
        ]);

    const memberRow = (m: Member): TExoSchema => (
        <li static={{ class: 'member', 'data-id': m.id }}>
            <input
                static={{ class: 'member__name', value: m.name }}
                handlers={{
                    onInput: (e: Event) =>
                        rt.patchEntity('members', m.id, {
                            name: (e.target as HTMLInputElement).value,
                        }),
                }}
            />
            <input
                static={{ class: 'member__role', value: m.role }}
                handlers={{
                    onInput: (e: Event) =>
                        rt.patchEntity('members', m.id, {
                            role: (e.target as HTMLInputElement).value,
                        }),
                }}
            />
            <select
                static={{ class: 'member__team' }}
                handlers={{
                    onChange: (e: Event) =>
                        rt.patchEntity('members', m.id, {
                            teamId: (e.target as HTMLSelectElement).value,
                        }),
                }}
            >
                {teams().map(t => (
                    <option static={{ value: t.id, selected: t.id === m.teamId }}>
                        {t.name}
                    </option>
                ))}
            </select>
            <button
                static={{ class: 'member__del', 'aria-label': 'Remove member' }}
                handlers={{ onClick: () => rt.removeEntity('members', m.id) }}
            >
                ✕
            </button>
        </li>
    );

    const teamSection = (t: Team): TExoSchema => {
        const addMember = () =>
            rt.createEntity('members', {
                id: `m-${Date.now()}`,
                teamId: t.id,
                name: 'New member',
                role: 'Member',
            });
        return (
            <section static={{ class: 'panel', 'data-team': t.id }}>
                <h2 static={{ class: 'panel__title' }}>
                    <span
                        static={{ class: 'panel__dot', style: `background:${t.color}` }}
                    />
                    {t.name}
                </h2>
                <ul static={{ class: 'members' }}>
                    {membersOf(t.id).map(memberRow)}
                </ul>
                <button static={{ class: 'btn' }} handlers={{ onClick: () => addMember() }}>
                    + member
                </button>
            </section>
        );
    };

    // A team panel rebuilds only when its member SET changes; a name/role edit
    // leaves the key unchanged, so the reconcile is a no-op and focus is kept.
    const panels = keyedList({
        items: teams,
        key: t => `${t.id}:${membersOf(t.id).map(m => m.id).join('+')}`,
        render: teamSection,
        subscribe: refresh => [
            rt.oimdbInstance.members.collection.subscribeOnAnyUpdate(refresh),
            rt.oimdbInstance.teams.collection.subscribeOnAnyUpdate(refresh),
        ],
    });

    return (
        <div
            static={{
                class: 'page page--people',
                onExoMount: panels.mount,
                onExoUnmount: panels.unmount,
            }}
        >
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>People</h1>
                <span static={{ class: 'page__hint' }}>
                    {`${rt.oimdbInstance.members.collection.getAll().length} members`}
                </span>
            </div>
            <div static={{ class: 'panels' }} bindable={{ children: panels.children }} />
        </div>
    );
}
