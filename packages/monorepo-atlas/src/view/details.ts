import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import type { TExoWritableBindable } from '@exodra/reactivity-types';
import { combine, type TExoViewState } from './viewState';
import type {
    TExoGraphEdge,
    TExoGraphModel,
    TExoGraphNode,
    TExoMember,
} from '../model/types';

/**
 * What the selected thing IS — the half of an architecture view that a picture
 * cannot carry.
 *
 * A dependency graph answers "who depends on whom" by shape; the questions that
 * actually stall a refactor are the next ones. Why is this edge here — which
 * import, in which file? Does it survive to runtime, or is it erased? Does the
 * package.json admit to it? Which rule does it break, and what was that rule
 * for? All of that is in the model, so it is shown rather than implied.
 */
export function createDetails(
    model: TExoGraphModel,
    state: TExoViewState
): TExoSchema {
    const nodeById = new Map(model.nodes.map(node => [node.id, node]));
    // What the drawer was last showing. Kept so that CLOSING it slides a filled
    // panel out of view instead of emptying it first and then collapsing an
    // empty box — the reader should see it leave, not evaporate.
    let last: string | undefined;

    const open = drawerState(state);

    return h('aside', {
        static: { class: 'exo-graph-details' },
        bindables: {
            // Shut, the drawer takes no width at all: the drawing gets the whole
            // stage until there is something to say about it.
            class: combine([open], () =>
                open.getValue()
                    ? 'exo-graph-details is-open'
                    : 'exo-graph-details'
            ),
            children: combine([state.focus], () => {
                const id = state.focus.getValue() ?? last;
                if (id === undefined) return [];
                const node = nodeById.get(id);
                if (!node) return [];
                last = id;

                const outgoing = model.edges.filter(edge => edge.from === id);
                const incoming = model.edges.filter(edge => edge.to === id);

                const canOpen = state.drill?.canOpen(id) ?? false;
                return [
                    h('div', {
                        static: {
                            class: 'exo-graph-details-body',
                            children: [
                                h('div', {
                                    static: {
                                        class: 'exo-graph-details-head',
                                        children: [
                                            ...(node.stereotype
                                                ? [
                                                      h('span', {
                                                          static: {
                                                              class: 'exo-graph-stereotype-tag',
                                                              textContent: `«${node.stereotype}»`,
                                                          },
                                                      }),
                                                  ]
                                                : []),
                                            h('h3', {
                                                static: {
                                                    textContent: node.label,
                                                },
                                            }),
                                            h('button', {
                                                static: {
                                                    type: 'button',
                                                    class: 'exo-graph-close',
                                                    'aria-label':
                                                        'Close the panel',
                                                    title: 'Close (Esc)',
                                                    textContent: '×',
                                                },
                                                handlers: {
                                                    onClick: () =>
                                                        state.focus.setValue(
                                                            null
                                                        ),
                                                },
                                            }),
                                        ],
                                    },
                                }),
                                ...(node.doc
                                    ? [
                                          h('p', {
                                              static: {
                                                  class: 'exo-graph-doc exo-graph-doc--lead',
                                                  textContent: node.doc,
                                              },
                                          }),
                                      ]
                                    : []),
                                ...(canOpen
                                    ? [
                                          h('button', {
                                              static: {
                                                  type: 'button',
                                                  class: 'exo-graph-open',
                                                  textContent: `Open ${node.label} →`,
                                                  title: 'See the classes, functions and types inside, and how they reach each other',
                                              },
                                              handlers: {
                                                  onClick: () =>
                                                      state.drill?.open(id),
                                              },
                                          }),
                                      ]
                                    : []),
                                h('dl', {
                                    static: {
                                        class: 'exo-graph-facts',
                                        children: [
                                            ...fact('Kind', node.kind),
                                            ...fact(
                                                'Layer',
                                                String(node.layer)
                                            ),
                                            ...(node.moduleCount !== undefined
                                                ? fact(
                                                      'Modules',
                                                      String(node.moduleCount)
                                                  )
                                                : []),
                                            ...(node.published !== undefined
                                                ? fact(
                                                      'Published',
                                                      node.published
                                                          ? 'yes'
                                                          : 'private'
                                                  )
                                                : []),
                                        ],
                                    },
                                }),
                                ...violations(node.violations),
                                ...memberList(node),
                                ...edgeList(
                                    'Depends on',
                                    outgoing,
                                    edge => edge.to
                                ),
                                ...edgeList(
                                    'Depended on by',
                                    incoming,
                                    edge => edge.from
                                ),
                            ],
                        },
                    }),
                ];
            }),
        },
    });
}

/**
 * Whether the drawer is out, which is NOT simply "is something selected".
 *
 * Opening it makes the drawing narrower, and a double-click is two clicks with
 * the geometry expected to hold still between them: slide the drawer in on the
 * first one and the second lands on the drawer instead of on the box, so
 * double-click-to-open silently stops working for anything near the right edge.
 *
 * So the first selection waits out the double-click window before opening.
 * Closing is immediate — that one is always deliberate.
 */
function drawerState(state: TExoViewState): TExoWritableBindable<boolean> {
    const open = bindable(false);
    let pending: ReturnType<typeof setTimeout> | undefined;

    state.focus.onChange(() => {
        clearTimeout(pending);
        if (state.focus.getValue() === null) {
            open.setValue(false);
            return;
        }
        // Already out: swapping between boxes must not stutter.
        if (open.getValue()) return;
        pending = setTimeout(() => open.setValue(true), DOUBLE_CLICK_WINDOW);
    });
    return open;
}

/** Long enough to catch a deliberate double-click, short enough to feel direct. */
const DOUBLE_CLICK_WINDOW = 280;

/**
 * Everything a box could not fit.
 *
 * A box has room for a handful of members and then has to say "… 32 more"; this
 * is where the rest lives, in full, with the type names in a signature still
 * clickable and whatever the author wrote about each one underneath.
 */
function memberList(node: TExoGraphNode): TExoSchema[] {
    const members = node.members ?? [];
    if (members.length === 0) return [];

    return [
        h('h4', { static: { textContent: `Members (${members.length})` } }),
        h('ul', {
            static: {
                class: 'exo-graph-member-list',
                children: members.map(memberRow),
            },
        }),
    ];
}

function memberRow(member: TExoMember): TExoSchema {
    return h('li', {
        static: {
            children: [
                h('span', {
                    static: {
                        class: 'exo-graph-visibility',
                        // The mark is UML; the word is for everyone else.
                        title: VISIBILITY_NAME[member.visibility ?? '+'],
                        textContent: member.visibility ?? '+',
                    },
                }),
                h('code', { static: { children: signature(member) } }),
                ...(member.modifier
                    ? [
                          h('span', {
                              static: {
                                  class: 'exo-graph-modifier',
                                  textContent: member.modifier,
                              },
                          }),
                      ]
                    : []),
                ...(member.doc
                    ? [
                          h('p', {
                              static: {
                                  class: 'exo-graph-doc',
                                  textContent: member.doc,
                              },
                          }),
                      ]
                    : []),
            ],
        },
    });
}

/**
 * The member's line, with the names in it still clickable.
 *
 * The split is done where the names are known — at extraction — so the panel and
 * the box agree about what is a link without matching identifiers twice.
 */
function signature(member: TExoMember): TExoSchema[] {
    const cut = member.full !== undefined && member.full !== member.text;
    const parts = (cut ? member.fullParts : member.parts) ?? [];
    if (parts.length === 0) {
        return [
            h('span', { static: { textContent: member.full ?? member.text } }),
        ];
    }
    return parts.map(part =>
        h('span', {
            static: part.link
                ? {
                      class: 'exo-graph-link',
                      'data-link': part.link,
                      textContent: part.text,
                  }
                : { textContent: part.text },
        })
    );
}

const VISIBILITY_NAME: Record<string, string> = {
    '+': 'public',
    '-': 'private',
    '#': 'protected',
};

function fact(label: string, value: string): TExoSchema[] {
    return [
        h('dt', { static: { textContent: label } }),
        h('dd', { static: { textContent: value } }),
    ];
}

function violations(
    list: readonly { rule: string; comment?: string }[]
): TExoSchema[] {
    if (list.length === 0) return [];
    return [
        h('div', {
            static: {
                class: 'exo-graph-violations',
                children: list.map(violation =>
                    h('div', {
                        static: {
                            class: 'exo-graph-violation',
                            children: [
                                // An icon + the rule name: the status colour is
                                // never the only thing carrying the meaning.
                                h('strong', {
                                    static: {
                                        textContent: `⚠ ${violation.rule}`,
                                    },
                                }),
                                h('p', {
                                    static: {
                                        textContent:
                                            violation.comment ??
                                            'This dependency breaks an architecture rule.',
                                    },
                                }),
                            ],
                        },
                    })
                ),
            },
        }),
    ];
}

function edgeList(
    title: string,
    edges: readonly TExoGraphEdge[],
    other: (edge: TExoGraphEdge) => string
): TExoSchema[] {
    if (edges.length === 0) return [];

    return [
        h('h4', { static: { textContent: `${title} (${edges.length})` } }),
        h('ul', {
            static: {
                class: 'exo-graph-edge-list',
                children: edges.map(edge =>
                    h('li', {
                        static: {
                            children: [
                                h('span', {
                                    static: {
                                        class: 'exo-graph-edge-name',
                                        textContent: other(edge),
                                    },
                                }),
                                h('span', {
                                    static: {
                                        class: 'exo-graph-edge-kinds',
                                        textContent: describeEdge(edge),
                                    },
                                }),
                                // A rule is broken by a DEPENDENCY, so it is
                                // reported on the dependency — not filed under
                                // the package and left to be matched up by hand.
                                ...violations(edge.violations),
                                // The evidence: the imports that put it there.
                                ...(edge.evidence.length > 0
                                    ? [
                                          h('details', {
                                              static: {
                                                  children: [
                                                      h('summary', {
                                                          static: {
                                                              textContent: `${
                                                                  edge.evidence
                                                                      .length
                                                              } import${
                                                                  edge.evidence
                                                                      .length ===
                                                                  1
                                                                      ? ''
                                                                      : 's'
                                                              }`,
                                                          },
                                                      }),
                                                      h('ul', {
                                                          static: {
                                                              children:
                                                                  edge.evidence.map(
                                                                      item =>
                                                                          h(
                                                                              'li',
                                                                              {
                                                                                  static: {
                                                                                      textContent: `${item.from} → ${item.specifier}`,
                                                                                  },
                                                                              }
                                                                          )
                                                                  ),
                                                          },
                                                      }),
                                                  ],
                                              },
                                          }),
                                      ]
                                    : []),
                            ],
                        },
                    })
                ),
            },
        }),
    ];
}

function describeEdge(edge: TExoGraphEdge): string {
    const parts = [edge.kinds.join(' + ')];
    if (edge.declared === false) parts.push('NOT in package.json');
    return parts.join(' · ');
}
