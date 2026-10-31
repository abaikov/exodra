import { EXO_NO_EFFECTS, EXO_NO_HANDLERS } from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoCursorDeclaration,
    TExoEventPort,
    TExoMachine,
    TExoRefPort,
} from '@exodra/core';
import type { TExoDomNode, TExoDomRenderNode } from '@exodra/dom';
import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';
import { createExoReactSyntheticEvent } from './createExoReactSyntheticEvent';
import { disposeExoReactSlot } from './disposeExoReactSlot';
import { writeExoReactProps } from './writeExoReactProps';
import type { TExoReactElement } from '../types/TExoReactElement';
import type { TExoReactHostState } from '../types/TExoReactHostState';
import type { TExoReactRange } from '../types/TExoReactRange';

const NO_PROPS: Readonly<Record<string, unknown>> = {};
const NO_REGIONS: TExoReactRange[] = [];
const NO_PARTS: TExoReactHostState[] = [];

function createHostState(
    element: Element,
    regions: TExoReactRange[],
    parts: TExoReactHostState[],
    handlerCount: number
): TExoReactHostState {
    return {
        element,
        regions,
        parts,
        handlers: handlerCount === 0 ? [] : new Array(handlerCount).fill(null),
        last: [],
        props: NO_PROPS,
        listeners: null,
        ref: null,
    };
}

export function createExoReactHost(
    declaration: TExoCursorDeclaration<unknown>,
    rootPort: TExoRefPort,
    regionPorts: readonly TExoChildrenPort[],
    eventPorts: readonly TExoEventPort[],
    partPorts: readonly TExoRefPort[],
    wire: (c: TExoDomNode, element: TExoReactElement, state: TExoReactHostState) => void,
    tag: string,
    source: ((values: readonly unknown[]) => TExoReactElement) | null
): TExoMachine<TExoDomNode> {
    return {
        exoReactTag: tag,
        exoReactSource: source,
        declaration,
        forms: [],
        createInitialState(c: TExoDomNode): TExoReactHostState {
            const read = c.portNodeReader();
            const table = c.portTable();
            const component = EXO_REACT_RENDER.component;
            const regions: TExoReactRange[] = regionPorts.length === 0 ? NO_REGIONS : [];
            for (let i = 0; i < regionPorts.length; i++) {
                regions.push({
                    list: c.childList(regionPorts[i]),
                    owner: c as TExoDomRenderNode,
                    component,
                    parentSlot: null,
                    slots: [],
                    leafCount: 0,
                    changed: false,
                });
            }
            const parts: TExoReactHostState[] = partPorts.length === 0 ? NO_PARTS : [];
            for (let i = 0; i < partPorts.length; i++) {
                parts.push(createHostState(read(table, partPorts[i]), NO_REGIONS, NO_PARTS, 0));
            }
            const state = createHostState(read(table, rootPort), regions, parts, eventPorts.length);
            for (let i = 0; i < eventPorts.length; i++) {
                c.on(eventPorts[i], function (this: Element, event: Event): void {
                    const handler = state.handlers[i];
                    if (typeof handler === 'function') {
                        handler(createExoReactSyntheticEvent(event, this));
                    }
                });
            }
            c.onTeardown((): void => {
                if (state.ref !== null) writeExoReactProps(state, state.props, null);
                for (let p = 0; p < parts.length; p++) {
                    if (parts[p].ref !== null) writeExoReactProps(parts[p], parts[p].props, null);
                }
                for (let r = 0; r < regions.length; r++) {
                    const slots = regions[r].slots;
                    for (let i = 0; i < slots.length; i++) disposeExoReactSlot(slots[i]);
                }
            });
            return state;
        },
        wire(c: TExoDomNode, element: TExoReactElement): void {
            wire(c, element, c.state as TExoReactHostState);
        },
        effects: EXO_NO_EFFECTS,
        handlers: EXO_NO_HANDLERS,
    } as unknown as TExoMachine<TExoDomNode>;
}
