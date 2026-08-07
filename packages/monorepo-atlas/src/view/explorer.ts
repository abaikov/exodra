import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';
import type { TExoGraphModel } from '../model/types';
import type { TExoGraphLayout } from '../layout/types';
import { createGraphView } from './graphView';
import {
    fitViewport,
    zoomAt,
    matchesQuery,
    IDENTITY_VIEWPORT,
} from './viewState';
import { createControls } from './controls';
import { createDetails } from './details';
import type { TExoViewState } from './viewState';

export type TExoExplorerState = TExoViewState;

/**
 * The whole thing: controls, the drawing, and the detail panel.
 *
 * Clicks are handled ONCE, here, by delegation. A graph has hundreds of targets
 * and putting a listener on each would mean hundreds of subscriptions to set up,
 * to tear down, and to keep in step with the data — for an event that can only
 * happen in one place at a time. The event's own target says what was hit.
 */
export function createExplorer(
    model: TExoGraphModel,
    layout: TExoGraphLayout,
    state: TExoExplorerState
): TExoSchema {
    let panning: { id: number; x: number; y: number } | undefined;
    // Set while a drag is in progress so the click that ends it is ignored.
    let dragged = false;

    return h('div', {
        static: {
            class: 'exo-graph',
            children: [
                ...(state.drill?.back
                    ? [
                          h('div', {
                              static: {
                                  class: 'exo-graph-breadcrumb',
                                  children: [
                                      h('button', {
                                          static: {
                                              type: 'button',
                                              textContent: '← All packages',
                                          },
                                          handlers: {
                                              onClick: () =>
                                                  state.drill?.back?.(),
                                          },
                                      }),
                                      h('span', {
                                          static: {
                                              textContent:
                                                  state.drill.title ?? '',
                                          },
                                      }),
                                  ],
                              },
                          }),
                      ]
                    : []),
                createControls(state, model, (query, source) => {
                    // Enter goes to the first match. The stage is found from the
                    // input that raised the event rather than held in a variable
                    // — the same tree is built on the server, where there is no
                    // element to hold on to yet.
                    const match = model.nodes.find(node =>
                        matchesQuery(node.label, query)
                    );
                    const stage = source
                        .closest('.exo-graph')
                        ?.querySelector('.exo-graph-stage');
                    if (!match || !stage) return;
                    state.focus.setValue(match.id);
                    centreOn(match.id, layout, state, stage);
                }),
                h('div', {
                    static: {
                        // The drawing and the panel are SIDE BY SIDE, not one on
                        // top of the other. A panel floating over the canvas is
                        // a piece of the canvas that cannot be dragged, and it
                        // covers exactly the part the reader just clicked.
                        class: 'exo-graph-body',
                        children: [
                            h('div', {
                                static: {
                                    class: 'exo-graph-stage',
                                    // Reachable and operable without a mouse: a diagram that
                                    // can only be moved by dragging is a diagram some readers
                                    // cannot move at all.
                                    tabindex: 0,
                                    role: 'group',
                                    'aria-label':
                                        'Diagram. Arrow keys pan, plus and minus zoom, 0 fits, Escape clears the selection.',
                                    children: [
                                        createGraphView(model, layout, state),
                                        zoomControls(state, layout),
                                    ],
                                },
                                handlers: {
                                    /**
                                     * Pinch (which every platform delivers as ctrl+wheel)
                                     * zooms about the pointer. A PLAIN wheel is left alone
                                     * so the page keeps scrolling — a graph that swallows
                                     * the wheel traps the reader halfway down an article,
                                     * and panning on scroll is not what anyone asked for.
                                     * Dragging is how you move it.
                                     */
                                    onWheel: (event: Event) => {
                                        const wheel = event as WheelEvent;
                                        if (!wheel.ctrlKey && !wheel.metaKey)
                                            return;
                                        wheel.preventDefault();

                                        const box = (
                                            wheel.currentTarget as HTMLElement
                                        ).getBoundingClientRect();
                                        state.viewport.setValue(
                                            zoomAt(
                                                state.viewport.getValue(),
                                                wheelZoomFactor(
                                                    wheel,
                                                    box.height
                                                ),
                                                wheel.clientX - box.left,
                                                wheel.clientY - box.top
                                            )
                                        );
                                    },
                                    onKeyDown: (event: Event) => {
                                        const key = event as KeyboardEvent;
                                        const target =
                                            key.target as Element | null;
                                        // Typing in the search box (or anywhere else with
                                        // its own text handling) is not a shortcut.
                                        if (
                                            target?.closest?.(
                                                'input, textarea, select, [contenteditable]'
                                            )
                                        ) {
                                            return;
                                        }

                                        const handled = onShortcut(
                                            key,
                                            state,
                                            layout
                                        );
                                        if (handled) {
                                            key.preventDefault();
                                            key.stopPropagation();
                                        }
                                    },
                                    onPointerDown: (event: Event) => {
                                        const pointer = event as PointerEvent;
                                        if (pointer.button !== 0) return;
                                        // Stop the browser starting its own drag (an image
                                        // drag, a text selection) the moment the button
                                        // goes down. The click that follows still fires.
                                        pointer.preventDefault();
                                        // NOT captured yet. Capturing here would retarget the
                                        // click that follows to the stage, and a plain click
                                        // on a node would stop selecting it.
                                        panning = {
                                            id: pointer.pointerId,
                                            x: pointer.clientX,
                                            y: pointer.clientY,
                                        };
                                        dragged = false;
                                    },
                                    onPointerMove: (event: Event) => {
                                        const pointer = event as PointerEvent;
                                        if (
                                            !panning ||
                                            panning.id !== pointer.pointerId
                                        )
                                            return;
                                        const dx = pointer.clientX - panning.x;
                                        const dy = pointer.clientY - panning.y;
                                        // A few pixels of travel is a click with a shaky
                                        // hand, not a drag. Once it IS a drag, capture the
                                        // pointer so it keeps working outside the stage.
                                        if (
                                            !dragged &&
                                            Math.abs(dx) + Math.abs(dy) > 3
                                        ) {
                                            dragged = true;
                                            (
                                                pointer.currentTarget as HTMLElement
                                            ).setPointerCapture(
                                                pointer.pointerId
                                            );
                                        }
                                        if (!dragged) return;
                                        panning = {
                                            id: panning.id,
                                            x: pointer.clientX,
                                            y: pointer.clientY,
                                        };
                                        const current =
                                            state.viewport.getValue();
                                        state.viewport.setValue({
                                            ...current,
                                            x: current.x + dx,
                                            y: current.y + dy,
                                        });
                                    },
                                    onPointerUp: (event: Event) => {
                                        const pointer = event as PointerEvent;
                                        (
                                            pointer.currentTarget as HTMLElement
                                        ).releasePointerCapture?.(
                                            pointer.pointerId
                                        );
                                        panning = undefined;
                                    },
                                    onPointerCancel: () => {
                                        panning = undefined;
                                    },
                                    // Capture can be lost without a pointerup — the window
                                    // loses focus, the OS takes over. Without this the graph
                                    // stays glued to the pointer afterwards.
                                    onLostPointerCapture: () => {
                                        panning = undefined;
                                    },
                                    /**
                                     * Double-click opens a package. The button in the panel
                                     * says so in words for anyone who has not guessed, but
                                     * double-click is what a reader tries first.
                                     */
                                    onDblClick: (event: Event) => {
                                        // Two quick pans in a row ARE a double-click to the
                                        // browser: same spot, close together in time. Only a
                                        // double-click with no movement in it means "open".
                                        // Without this, panning twice quickly drills into a
                                        // package and looks exactly like panning breaking.
                                        if (dragged) return;
                                        const target =
                                            event.target as Element | null;
                                        const id = target
                                            ?.closest?.('[data-node]')
                                            ?.getAttribute('data-node');
                                        if (!id || !state.drill?.canOpen(id))
                                            return;
                                        event.preventDefault();
                                        state.drill.open(id);
                                    },
                                },
                            }),
                            createDetails(model, state),
                        ],
                    },
                    handlers: {
                        /**
                         * One click handler for the drawing AND the panel.
                         *
                         * They are one interface: a type name in a panel and a
                         * type name in a box both mean "go there", and handling
                         * them in one place is what keeps them behaving alike.
                         */
                        onClick: (event: Event) => {
                            // A drag that ended on a node must not also select
                            // it: the reader was moving the graph, not picking.
                            if (dragged) {
                                dragged = false;
                                return;
                            }
                            const target = event.target as Element | null;
                            const stage = (
                                event.currentTarget as Element
                            ).querySelector('.exo-graph-stage');

                            // A type name inside a member: go to it. This is the
                            // whole point of writing the members out — a
                            // signature that mentions something on the diagram
                            // should lead there.
                            const linked = target
                                ?.closest?.('[data-link]')
                                ?.getAttribute('data-link');
                            if (linked && stage) {
                                state.focus.setValue(linked);
                                centreOn(linked, layout, state, stage);
                                return;
                            }

                            // Reading the panel is not picking: it must not
                            // clear the very selection that filled the panel.
                            if (target?.closest?.('.exo-graph-details')) return;

                            const node = target?.closest?.('[data-node]');
                            // A click on empty canvas clears the selection —
                            // the way out has to be as easy as the way in.
                            state.focus.setValue(
                                node?.getAttribute('data-node') ?? null
                            );
                        },
                    },
                }),
            ],
        },
    });
}

/**
 * How far one wheel event zooms.
 *
 * `deltaY` is not in pixels unless the browser says so: `deltaMode` may report
 * lines or pages, and treating 3 lines as 3 pixels is why a mouse wheel feels
 * dead next to a trackpad. Normalise first, then move by a fixed number of
 * doublings per unit — the same shape d3-zoom uses, which is what people's
 * hands are calibrated to.
 */
export function wheelZoomFactor(wheel: WheelEvent, pageHeight: number): number {
    const LINE = 16;
    const pixels =
        wheel.deltaMode === 1
            ? wheel.deltaY * LINE
            : wheel.deltaMode === 2
            ? wheel.deltaY * pageHeight
            : wheel.deltaY;
    // A trackpad PINCH arrives as ctrl+wheel with much smaller numbers than a
    // mouse wheel sends — without a multiplier a whole pinch moves the zoom a
    // few percent and feels dead. (d3-zoom carries the same factor of ten for
    // the same reason.)
    const pinch = wheel.ctrlKey ? 10 : 1;
    // 0.002 doublings per pixel — d3-zoom's calibration, which is what hands
    // that have used any graph tool are already tuned to. Clamped so a flick on
    // a fast trackpad cannot cross several zoom levels in one event.
    const doublings = Math.max(-1.2, Math.min(1.2, -pixels * pinch * 0.002));
    return 2 ** doublings;
}

/** Zoom in, out, and fit — the same actions the gestures do, for everyone else. */
function zoomControls(
    state: TExoExplorerState,
    layout: TExoGraphLayout
): TExoSchema {
    const button = (
        label: string,
        title: string,
        onClick: (event: Event) => void
    ): TExoSchema =>
        h('button', {
            static: {
                type: 'button',
                textContent: label,
                title,
                'aria-label': title,
            },
            handlers: { onClick },
        });

    const zoomBy = (factor: number) => (event: Event) => {
        const stage = (event.currentTarget as HTMLElement).closest(
            '.exo-graph-stage'
        ) as HTMLElement | null;
        const box = stage?.getBoundingClientRect();
        state.viewport.setValue(
            zoomAt(
                state.viewport.getValue(),
                factor,
                (box?.width ?? 0) / 2,
                (box?.height ?? 0) / 2
            )
        );
    };

    return h('div', {
        static: {
            class: 'exo-graph-zoom',
            children: [
                button('+', 'Zoom in', zoomBy(1.25)),
                button('−', 'Zoom out', zoomBy(0.8)),
                button('⤢', 'Fit to the window', event => {
                    const stage = (event.currentTarget as HTMLElement).closest(
                        '.exo-graph-stage'
                    ) as HTMLElement | null;
                    const box = stage?.getBoundingClientRect();
                    state.viewport.setValue(
                        box ? fitViewport(layout, box) : IDENTITY_VIEWPORT
                    );
                }),
            ],
        },
    });
}

/** Bring a node to the middle of the window, keeping the current zoom. */
function centreOn(
    id: string,
    layout: TExoGraphLayout,
    state: TExoExplorerState,
    stageElement: Element
): void {
    const placed = layout.nodes.find(node => node.id === id);
    const stage = stageElement.getBoundingClientRect();
    if (!placed) return;

    const { k } = state.viewport.getValue();
    state.viewport.setValue({
        k,
        x: stage.width / 2 - (placed.x + placed.width / 2) * k,
        y: stage.height / 2 - (placed.y + placed.height / 2) * k,
    });
}

/**
 * Keyboard control of the drawing.
 *
 * The same three things the mouse can do — move it, scale it, put it back —
 * plus the two the mouse cannot do politely: leave, and open what is selected.
 * Returns whether the key was ours, so an unhandled one still reaches the page.
 */
function onShortcut(
    key: KeyboardEvent,
    state: TExoExplorerState,
    layout: TExoGraphLayout
): boolean {
    const stage = (key.currentTarget as HTMLElement).getBoundingClientRect();
    const viewport = state.viewport.getValue();
    // A modest step by default, a screenful-ish with shift: reading a diagram
    // means both nudging and crossing it.
    const step = key.shiftKey ? 240 : 60;

    const pan = (dx: number, dy: number): boolean => {
        state.viewport.setValue({
            ...viewport,
            x: viewport.x + dx,
            y: viewport.y + dy,
        });
        return true;
    };
    const zoom = (factor: number): boolean => {
        state.viewport.setValue(
            zoomAt(viewport, factor, stage.width / 2, stage.height / 2)
        );
        return true;
    };

    switch (key.key) {
        case 'ArrowLeft':
            return pan(step, 0);
        case 'ArrowRight':
            return pan(-step, 0);
        case 'ArrowUp':
            return pan(0, step);
        case 'ArrowDown':
            return pan(0, -step);
        case '+':
        case '=':
            return zoom(1.3);
        case '-':
        case '_':
            return zoom(1 / 1.3);
        case '0':
            state.viewport.setValue(fitViewport(layout, stage));
            return true;
        case 'Escape':
            // One key for "never mind": drop the selection and the search.
            state.focus.setValue(null);
            state.query.setValue('');
            return true;
        case 'Enter': {
            const focus = state.focus.getValue();
            if (focus === null || !state.drill?.canOpen(focus)) return false;
            state.drill.open(focus);
            return true;
        }
        default:
            return false;
    }
}
