import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import { getRuntime } from '../app/runtime';
import { keyedList } from '../app/keyed-list';

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
) {
    const rt = getRuntime();
    const draft = bindable('');

    const items = (): Swatchable[] =>
        (rt.oimdbInstance[name].collection.getAll() as readonly Swatchable[]).slice();

    const row = (item: Swatchable): TExoSchema => (
        <li static={{ class: 'swatch', 'data-id': item.id }}>
            <span static={{ class: 'swatch__dot', style: `background:${item.color}` }} />
            <input
                static={{ class: 'swatch__name', value: String(item[nameField] ?? '') }}
                handlers={{
                    onInput: (e: Event) =>
                        rt.patchEntity(name, item.id, {
                            [nameField]: (e.target as HTMLInputElement).value,
                        }),
                }}
            />
            <input
                static={{ class: 'swatch__color', type: 'color', value: item.color }}
                handlers={{
                    onInput: (e: Event) =>
                        rt.patchEntity(name, item.id, {
                            color: (e.target as HTMLInputElement).value,
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

    // Rebuild a row only when the SET changes (add/remove) — a field edit leaves
    // the key (id) unchanged, so the reconcile is a no-op and focus is kept.
    const rows = keyedList({
        items,
        key: r => r.id,
        render: row,
        subscribe: refresh => [
            rt.oimdbInstance[name].collection.subscribeOnAnyUpdate(refresh),
        ],
    });

    const add = () => {
        const v = draft.getValue().trim();
        if (!v) return;
        const id = `${name}-${v.toLowerCase().replace(/\s+/g, '-')}-${items().length}`;
        rt.createEntity(name, { id, [nameField]: v, color: '#64748b' });
        draft.setValue('');
    };

    return {
        mount: rows.mount,
        unmount: rows.unmount,
        schema: (
            <section static={{ class: 'panel' }}>
                <h2 static={{ class: 'panel__title' }}>{title}</h2>
                <ul static={{ class: 'swatches' }} bindable={{ children: rows.children }} />
                <div static={{ class: 'panel__add' }}>
                    <input
                        static={{
                            class: 'add__input',
                            placeholder: `New ${title.toLowerCase()}…`,
                        }}
                        bindable={{ value: draft }}
                        handlers={{
                            onInput: (e: Event) =>
                                draft.setValue(
                                    (e.target as HTMLInputElement).value
                                ),
                            onKeyDown: (e: KeyboardEvent) => {
                                if (e.key === 'Enter') add();
                            },
                        }}
                    />
                    <button static={{ class: 'btn' }} handlers={{ onClick: () => add() }}>
                        Add
                    </button>
                </div>
            </section>
        ) as TExoSchema,
    };
}

export default function taxonomyPage(): TExoSchema {
    const tags = swatchEditor('Tags', 'tags', 'label');
    const labels = swatchEditor('Labels', 'labels', 'name');

    return (
        <div
            static={{
                class: 'page page--taxonomy',
                onExoMount: () => {
                    tags.mount();
                    labels.mount();
                },
                onExoUnmount: () => {
                    tags.unmount();
                    labels.unmount();
                },
            }}
        >
            <div static={{ class: 'page__bar' }}>
                <h1 static={{ class: 'page__title' }}>Tags &amp; Labels</h1>
                <span static={{ class: 'page__hint' }}>
                    edit inline — reactive store writes
                </span>
            </div>
            <div static={{ class: 'panels' }}>
                {tags.schema}
                {labels.schema}
            </div>
        </div>
    );
}
