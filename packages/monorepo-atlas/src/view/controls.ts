import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';
import { combine, matchesQuery, type TExoViewState } from './viewState';
import type { TExoGraphModel, TExoNodeKind, TExoRelation } from '../model/types';
import type { TExoWritableBindable } from '@exodra/reactivity-types';

/**
 * What the READER can change: which parts of the graph are drawn.
 *
 * Colour is not here on purpose. It belongs to whoever embeds the graph — a
 * host site has a palette already, and a graph that offers its own is a graph
 * that looks foreign on every page it appears on. The palette is an API (see
 * `mountExplorer`'s `colors`, or just the CSS custom properties), not a control.
 */
export function createControls(
    state: TExoViewState,
    model: TExoGraphModel,
    onSubmit?: (query: string, source: HTMLElement) => void
): TExoSchema {
    return h('div', {
        static: {
            class: 'exo-graph-toolbar',
            children: [
                search(state, model, onSubmit),
                ...legend(model),
                ...relationLegend(model),
                toggle(
                    'Type-only edges',
                    'Imports erased at build time — they do not exist at runtime.',
                    state.showTypeOnly
                ),
                toggle(
                    'Only rule violations',
                    'Hide everything that obeys the architecture rules.',
                    state.violationsOnly
                ),
            ],
        },
    });
}

/**
 * Find a box by name.
 *
 * A diagram with sixty boxes on it is a haystack, and the reader almost always
 * arrives knowing the name of the thing they came for. Typing dims everything
 * that does not match — Enter goes to the first one that does, because being
 * shown where it is beats being told that it exists.
 */
function search(
    state: TExoViewState,
    model: TExoGraphModel,
    onSubmit?: (query: string, source: HTMLElement) => void
): TExoSchema {
    return h('div', {
        static: {
            class: 'exo-graph-search',
            children: [
                h('input', {
                    static: {
                        type: 'search',
                        // Named for what is on the diagram, which differs by
                        // level: packages at the top, declarations inside one.
                        placeholder:
                            model.granularity === 'package'
                                ? 'Find a package…'
                                : 'Find a class, function or type…',
                        'aria-label': 'Find on the diagram',
                        spellcheck: 'false',
                        autocomplete: 'off',
                    },
                    bindables: { value: state.query },
                    handlers: {
                        onInput: (event: Event) => {
                            state.query.setValue(
                                (event.target as HTMLInputElement).value
                            );
                        },
                        onKeyDown: (event: Event) => {
                            const key = event as KeyboardEvent;
                            if (key.key === 'Escape') {
                                state.query.setValue('');
                                (key.target as HTMLInputElement).value = '';
                                return;
                            }
                            if (key.key !== 'Enter') return;
                            key.preventDefault();
                            onSubmit?.(
                                state.query.getValue(),
                                key.target as HTMLElement
                            );
                        },
                    },
                }),
                h('span', {
                    static: { class: 'exo-graph-search-count' },
                    bindables: {
                        textContent: combine([state.query], () => {
                            const query = state.query.getValue();
                            if (query === '') return '';
                            const hits = model.nodes.filter(node =>
                                matchesQuery(node.label, query)
                            ).length;
                            return hits === 0
                                ? 'no matches'
                                : `${hits} of ${model.nodes.length}`;
                        }),
                    },
                }),
            ],
        },
    });
}

/**
 * What the arrowheads mean.
 *
 * UML notation is only self-explanatory to people who already read UML. The
 * markers are defined once in the drawing itself, so these swatches point at
 * the same definitions and cannot drift from what is on the diagram.
 */
function relationLegend(model: TExoGraphModel): TExoSchema[] {
    const present = RELATION_ORDER.filter(relation =>
        model.edges.some(edge => edge.relation === relation)
    );
    if (present.length === 0) return [];

    return [
        h('div', {
            static: {
                class: 'exo-graph-legend exo-graph-legend--relations',
                children: present.map(relation =>
                    h('span', {
                        static: {
                            class: 'exo-graph-legend-item',
                            title: RELATION_MEANING[relation],
                            children: [
                                h('svg', {
                                    static: {
                                        class: 'exo-graph-relation-swatch',
                                        width: 34,
                                        height: 10,
                                        'aria-hidden': 'true',
                                        children: [
                                            h('path', {
                                                static: {
                                                    class: `exo-edge exo-edge--${relation}`,
                                                    d: 'M1,5 L22,5',
                                                    'marker-end': `url(#exo-arrow-${relation})`,
                                                },
                                            }),
                                        ],
                                    },
                                }),
                                h('span', {
                                    static: { textContent: RELATION_LABEL[relation] },
                                }),
                            ],
                        },
                    })
                ),
            },
        }),
    ];
}

const RELATION_ORDER: readonly TExoRelation[] = [
    'inheritance',
    'realization',
    'composition',
    'association',
    'dependency',
];

const RELATION_LABEL: Record<TExoRelation, string> = {
    inheritance: 'extends',
    realization: 'implements',
    composition: 'constructs',
    association: 'calls',
    dependency: 'uses type',
};

const RELATION_MEANING: Record<TExoRelation, string> = {
    inheritance: 'Inheritance — the source extends the target',
    realization: 'Realization — the source implements the target',
    composition: 'Composition — the source creates instances of the target',
    association: 'Association — the source calls the target',
    dependency: 'Dependency — the source only names the target in a type',
};

function toggle(
    label: string,
    title: string,
    value: TExoWritableBindable<boolean>
): TExoSchema {
    return h('label', {
        static: {
            class: 'exo-graph-toggle',
            title,
            children: [
                h('input', {
                    static: { type: 'checkbox' },
                    bindables: { checked: value },
                    handlers: {
                        onChange: (event: Event) => {
                            value.setValue(
                                (event.target as HTMLInputElement).checked
                            );
                        },
                    },
                }),
                h('span', { static: { textContent: label } }),
            ],
        },
    });
}

/**
 * What the colours mean, spelled out. Identity may not rest on colour alone —
 * and the same three slots carry different categories at different levels, so
 * an unlabelled swatch would be worse than none.
 */
function legend(model: TExoGraphModel): TExoSchema[] {
    const entries = Object.entries(model.legend ?? {}).filter(([kind]) =>
        model.nodes.some(node => node.kind === kind)
    );
    if (entries.length === 0) return [];

    return [
        h('div', {
            static: {
                class: 'exo-graph-legend',
                children: entries.map(([kind, label]) =>
                    h('span', {
                        static: {
                            class: 'exo-graph-legend-item',
                            children: [
                                h('span', {
                                    static: {
                                        class: `exo-graph-swatch exo-graph-swatch--${kind as TExoNodeKind}`,
                                    },
                                }),
                                h('span', { static: { textContent: label } }),
                            ],
                        },
                    })
                ),
            },
        }),
    ];
}
