import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import { fromOimdb, keyedChildren } from '@oimdb/exodra';
import { getRuntime } from '../app/runtime';
import { sameRows } from '../lib/same-rows';

// The shared shape of a "swatch" reference entity (tags carry `label`, labels
// carry `name`; both carry `id` + `color`). Tag and Label are both assignable to
// this, so no `unknown` double-cast is needed.
interface Swatchable {
    id: string;
    color: string;
    label?: string;
    name?: string;
}

// A small generic editor for a "swatch + name" reference collection (tags/labels).
// Each row edits live (onInput → patchEntity); add/delete go through the runtime.
function swatchEditor(
    title: string,
    name: 'tags' | 'labels',
    nameField: 'label' | 'name'
): TExoSchema {
    const rt = getRuntime();
    const draft = bindable('');

    const items = (): readonly Swatchable[] =>
        rt.oimdbInstance[name].collection.getAll() as readonly Swatchable[];

    const row = (item: Swatchable): TExoSchema => (
        <li static={{ class: 'swatch', 'data-id': item.id }}>
            <span static={{ class: 'swatch__dot', style: `background:${item.color}` }} />
            <input
                static={{ class: 'swatch__name', value: String(item[nameField] ?? '') }}
                handlers={{
                    onInput: e =>
                        rt.patchEntity(name, item.id, {
                            [nameField]: e.currentTarget.value,
                        }),
                }}
            />
            <input
                static={{ class: 'swatch__color', type: 'color', value: item.color }}
                handlers={{
                    onInput: e =>
                        rt.patchEntity(name, item.id, {
                            color: e.currentTarget.value,
                        }),
                }}
            />
            <button
                static={{ class: 'swatch__del', 'aria-label': 'Delete' }}
                handlers={{ onClick: () => rt.removeEntity(name, item.id) }}
            >
                ✕
            </button>
        </li>
    );

    // Identity-stable rows straight off the collection. `@oimdb/exodra` owns the
    // (lazy, ref-counted) subscription — it subscribes only while this list is
    // mounted and tears down on unmount — so there is no mount/unmount plumbing
    // here. `keyedChildren` keys by id, so a field edit (same id) is a reconcile
    // no-op and the focused input keeps focus.
    const rows = keyedChildren(
        fromOimdb(
            items,
            cb => rt.oimdbInstance[name].collection.subscribeOnAnyUpdate(cb),
            { equals: sameRows }
        ),
        { key: r => r.id, render: row }
    );

    const add = (): void => {
        const v = draft.getValue().trim();
        if (!v) return;
        const id = `${name}-${v.toLowerCase().replace(/\s+/g, '-')}-${items().length}`;
        rt.createEntity(name, { id, [nameField]: v, color: '#64748b' });
        draft.setValue('');
    };

    return (
        <section static={{ class: 'panel' }}>
            <h2 static={{ class: 'panel__title' }}>{title}</h2>
            <ul static={{ class: 'swatches' }} bindable={{ children: rows }} />
            <div static={{ class: 'panel__add' }}>
                <input
                    static={{
                        class: 'add__input',
                        placeholder: `New ${title.toLowerCase()}…`,
                    }}
                    bindable={{ value: draft }}
                    handlers={{
                        onInput: e =>
                            draft.setValue(e.currentTarget.value),
                        onKeyDown: e => {
                            if (e.key === 'Enter') add();
                        },
                    }}
                />
                <button static={{ class: 'btn' }} handlers={{ onClick: () => add() }}>
                    Add
                </button>
            </div>
        </section>
    );
}

export default function taxonomyPage(): TExoSchema {
    return (
        <div static={{ class: 'page page--taxonomy' }}>
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Tags &amp; Labels</h1>
                <span static={{ class: 'page__hint' }}>
                    edit inline — reactive store writes
                </span>
            </div>
            <div static={{ class: 'panels' }}>
                {swatchEditor('Tags', 'tags', 'label')}
                {swatchEditor('Labels', 'labels', 'name')}
            </div>
        </div>
    );
}
