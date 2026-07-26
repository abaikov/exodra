import type { TExoSchema } from '@exodra/core';
import { fromOimdb, keyedChildren } from '@oimdb/exodra';
import type { Member, Team } from '../domain/types';
import { getRuntime } from '../app/runtime';

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
    // The panel key depends on RELATED data (the member set), not just the `teams`
    // array, so the wrapping bindable must forward every store update
    // (`alwaysNotify`) and let `keyedChildren` dedup on the rendered key set —
    // gating on the `teams` array alone would swallow member add/remove.
    const panels = keyedChildren(
        fromOimdb(
            teams,
            cb => {
                const us = [
                    rt.oimdbInstance.members.collection.subscribeOnAnyUpdate(cb),
                    rt.oimdbInstance.teams.collection.subscribeOnAnyUpdate(cb),
                ];
                return () => us.forEach(u => u());
            },
            { alwaysNotify: true }
        ),
        {
            key: t => `${t.id}:${membersOf(t.id).map(m => m.id).join('+')}`,
            render: teamSection,
        }
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
