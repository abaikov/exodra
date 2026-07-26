import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import { fromOimdb, keyedChildren } from '@oimdb/exodra';
import type { Activity } from '../domain/types';
import { getRuntime } from '../app/runtime';
import { sameRows } from '../lib/same-rows';

const KIND_ICON: Record<Activity['kind'], string> = {
    'task.created': '✚',
    'task.moved': '⇄',
    'task.assigned': '☺',
    'task.tagged': '#',
    'task.deleted': '✕',
    'comment.added': '🗨',
    'project.archived': '📦',
};

function row(a: Activity): TExoSchema {
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
    const empty = bindable('');
    const setEmpty = () =>
        empty.setValue(
            rt.oimdbInstance.activity.collection.getAll().length
                ? ''
                : 'No activity yet — do something on the Board.'
        );

    const feed = keyedChildren(
        fromOimdb(
            () =>
                rt.oimdbInstance.activity.collection
                    .getAll()
                    .slice()
                    .sort((a, b) => b.at - a.at),
            cb =>
                rt.oimdbInstance.activity.collection.subscribeOnAnyUpdate(() => {
                    cb();
                    setEmpty();
                }),
            { equals: sameRows }
        ),
        { key: a => a.id, render: row }
    );
    setEmpty();

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
