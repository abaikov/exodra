import type { TExoSchema } from '@exodra/core';
import { bindable, derive } from '@exodra/reactivity';
import { exoRows } from '@oimdb/exodra';
import { getRuntime } from '../app/runtime';

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
    const view = rt.views[name];

    // The list is just the collection's pks (`exoRows`, key = pk). Each row is
    // built ONCE per pk and binds its own value: the swatch dot follows the entity
    // reactively (a color edit repaints it in place), while the name/color inputs
    // stay uncontrolled so the focused field keeps focus. Nothing is folded into a
    // key, so a field edit is a reconcile no-op.
    const row = (pk: string): TExoSchema => {
        const item = view.byPk(pk);
        const cur = item.getValue() as Swatchable | undefined;
        return (
            <li static={{ class: 'swatch', 'data-id': pk }}>
                <span
                    static={{ class: 'swatch__dot' }}
                    bindable={{
                        style: derive(
                            item,
                            (i: Swatchable | undefined) => `background:${i?.color ?? ''}`
                        ),
                    }}
                />
                <input
                    static={{ class: 'swatch__name', value: String(cur?.[nameField] ?? '') }}
                    handlers={{
                        onInput: e =>
                            rt.patchEntity(name, pk, {
                                [nameField]: e.currentTarget.value,
                            }),
                    }}
                />
                <input
                    static={{ class: 'swatch__color', type: 'color', value: cur?.color ?? '#64748b' }}
                    handlers={{
                        onInput: e =>
                            rt.patchEntity(name, pk, {
                                color: e.currentTarget.value,
                            }),
                    }}
                />
                <button
                    static={{ class: 'swatch__del', 'aria-label': 'Delete' }}
                    handlers={{ onClick: () => rt.removeEntity(name, pk) }}
                >
                    ✕
                </button>
            </li>
        );
    };

    const rows = exoRows(view.allPks(), row);

    const add = (): void => {
        const v = draft.getValue().trim();
        if (!v) return;
        const id = `${name}-${v.toLowerCase().replace(/\s+/g, '-')}-${rt.oimdbInstance[name].collection.getAll().length}`;
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
