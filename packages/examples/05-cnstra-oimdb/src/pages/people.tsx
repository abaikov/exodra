import type { TExoSchema } from '@exodra/core';
import { derive } from '@exodra/reactivity';
import { exoRows } from '@oimdb/exodra';
import { getRuntime } from '../app/runtime';

export default function peoplePage(): TExoSchema {
    const rt = getRuntime();
    const v = rt.views;

    // One panel per TEAM (list = team pks, key = pk). The panel is built ONCE;
    // its member list is a NESTED `.rows` keyed by member pk, so a member add/
    // remove reconciles just that panel's <ul> and a name/role edit is a no-op
    // (the row keeps its own bindable + focus). No membership folded into a key.
    const teamSection = (teamPk: string): TExoSchema => {
        const team = v.teams.byPk(teamPk);
        const addMember = () =>
            rt.createEntity('members', {
                id: `m-${Date.now()}`,
                teamId: teamPk,
                name: 'New member',
                role: 'Member',
            });

        const members = v.members.byTeam.rows(teamPk, (member, pk) => {
            const cur = member.getValue();
            // Options follow the teams collection so they never go stale; the
            // <select>'s bound value reflects the member's current team.
            const teamOptions = derive(v.teams.all(), ts =>
                ts.map(t => <option static={{ value: t.id }}>{t.name}</option>)
            );
            return (
                <li static={{ class: 'member', 'data-id': pk }}>
                    <input
                        static={{ class: 'member__name', value: cur?.name ?? '' }}
                        handlers={{
                            onInput: e =>
                                rt.patchEntity('members', pk, { name: e.currentTarget.value }),
                        }}
                    />
                    <input
                        static={{ class: 'member__role', value: cur?.role ?? '' }}
                        handlers={{
                            onInput: e =>
                                rt.patchEntity('members', pk, { role: e.currentTarget.value }),
                        }}
                    />
                    <select
                        static={{ class: 'member__team' }}
                        bindable={{
                            value: derive(member, m => m?.teamId ?? ''),
                            children: teamOptions,
                        }}
                        handlers={{
                            onChange: e =>
                                rt.patchEntity('members', pk, { teamId: e.currentTarget.value }),
                        }}
                    />
                    <button
                        static={{ class: 'member__del', 'aria-label': 'Remove member' }}
                        handlers={{ onClick: () => rt.removeEntity('members', pk) }}
                    >
                        ✕
                    </button>
                </li>
            );
        });

        return (
            <section static={{ class: 'panel', 'data-team': teamPk }}>
                <h2 static={{ class: 'panel__title' }}>
                    <span
                        static={{ class: 'panel__dot' }}
                        bindable={{ style: derive(team, t => `background:${t?.color ?? ''}`) }}
                    />
                    <span bindable={{ textContent: derive(team, t => t?.name ?? '') }} />
                </h2>
                <ul static={{ class: 'members' }} bindable={{ children: members }} />
                <button static={{ class: 'btn' }} handlers={{ onClick: () => addMember() }}>
                    + member
                </button>
            </section>
        );
    };

    const panels = exoRows(v.teams.allPks(), teamSection);

    return (
        <div static={{ class: 'page page--people' }}>
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>People</h1>
                <span
                    static={{ class: 'page__hint' }}
                    bindable={{
                        textContent: derive(v.members.all(), ms => `${ms.length} members`),
                    }}
                />
            </div>
            <div static={{ class: 'panels' }} bindable={{ children: panels }} />
        </div>
    );
}
