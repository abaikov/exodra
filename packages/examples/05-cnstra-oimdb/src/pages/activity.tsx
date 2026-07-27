import type { TExoSchema } from '@exodra/core';
import { derive } from '@exodra/reactivity';
import type { Activity } from '../domain/types';
import { getRuntime } from '../app/runtime';

const KIND_ICON: Record<Activity['kind'], string> = {
    'task.created': '✚',
    'task.moved': '⇄',
    'task.assigned': '☺',
    'task.tagged': '#',
    'task.deleted': '✕',
    'comment.added': '🗨',
    'project.archived': '📦',
};

// Activity records are append-only and immutable, so a build-time snapshot is
// correct forever — no per-field bindable needed.
function row(a: Activity | undefined): TExoSchema {
    if (!a) return <li static={{ class: 'feed__item' }} />;
    return (
        <li static={{ class: 'feed__item', 'data-kind': a.kind }}>
            <span static={{ class: 'feed__icon' }}>{KIND_ICON[a.kind] ?? '•'}</span>
            <span static={{ class: 'feed__summary' }}>{a.summary}</span>
            <span static={{ class: 'feed__kind' }}>{a.kind}</span>
        </li>
    );
}

// Live audit feed — every settled CNS command appends an Activity record (see the
// activity neuron), and this page reconciles newest-first as they arrive.
export default function activityPage(): TExoSchema {
    const rt = getRuntime();

    // Empty-state message, reactive off the whole collection — no manual toggle.
    const empty = derive(rt.views.activity.all(), list =>
        list.length ? '' : 'No activity yet — do something on the Board.'
    );

    // Newest-first order lives in the index (maintained incrementally). `.rows`
    // keys by pk — no key function — and each appended activity is one insert, not
    // a getAll()+sort of the whole log.
    const feed = rt.views.activity.byTime.rows(a => row(a.getValue()));

    return (
        <div static={{ class: 'page page--activity' }}>
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Activity</h1>
                <span static={{ class: 'page__hint' }}>
                    appended by the cnstra activity neuron
                </span>
            </div>
            <p static={{ class: 'muted' }} bindable={{ textContent: empty }} />
            <ul static={{ class: 'feed' }} bindable={{ children: feed }} />
        </div>
    );
}
