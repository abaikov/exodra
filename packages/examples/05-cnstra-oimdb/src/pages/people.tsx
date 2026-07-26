import type { TExoSchema } from '@exodra/core';
import { structuralList } from '../lib/structural-list';
import type { Member, Team } from '../domain/types';
import { getRuntime } from '../app/runtime';

export default function peoplePage(): TExoSchema {
    const rt = getRuntime();

    const teams = () => rt.oimdbInstance.teams.collection.getAll();
    const membersOf = (teamId: string): Member[] =>
        rt.oimdbInstance.members.collection.getManyByPks([
            ...rt.oimdbInstance.membersByTeam.getPksByKey(teamId),
        ]);

    const memberRow = (m: Member, allTeams: readonly Team[]): TExoSchema => (
        <li static={{ class: 'member', 'data-id': m.id }}>
            <input
                static={{ class: 'member__name', value: m.name }}
                handlers={{
                    onInput: e =>
                        rt.patchEntity('members', m.id, {
                            name: e.currentTarget.value,
                        }),
                }}
            />
            <input
                static={{ class: 'member__role', value: m.role }}
                handlers={{
                    onInput: e =>
                        rt.patchEntity('members', m.id, {
                            role: e.currentTarget.value,
                        }),
                }}
            />
            <select
                static={{ class: 'member__team' }}
                handlers={{
                    onChange: e =>
                        rt.patchEntity('members', m.id, {
                            teamId: e.currentTarget.value,
                        }),
                }}
            >
                {allTeams.map(t => (
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
        // Read the team list ONCE per panel (for every member's team <select>),
        // not once per member row — same freshness (this render pass), fewer reads.
        const allTeams = teams();
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
                    {membersOf(t.id).map(m => memberRow(m, allTeams))}
                </ul>
                <button static={{ class: 'btn' }} handlers={{ onClick: () => addMember() }}>
                    + member
                </button>
            </section>
        );
    };

    // A team panel rebuilds only when its member SET changes; a name/role edit
    // leaves the key unchanged, so the reconcile is a no-op and focus is kept.
    // The panel key depends on RELATED data (the member set), not just the `teams`
    // array, so the wrapping bindable must forward every store update and let
    // `exoChildren` dedup on the rendered key set — gating on the `teams` array
    // alone would swallow member add/remove.
    const panels = structuralList(
        teams,
        [rt.oimdbInstance.members.collection, rt.oimdbInstance.teams.collection],
        t => `${t.id}:${membersOf(t.id).map(m => m.id).join('+')}`,
        teamSection
    );

    return (
        <div static={{ class: 'page page--people' }}>
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>People</h1>
                <span static={{ class: 'page__hint' }}>
                    {`${rt.oimdbInstance.members.collection.getAll().length} members`}
                </span>
            </div>
            <div static={{ class: 'panels' }} bindable={{ children: panels }} />
        </div>
    );
}
