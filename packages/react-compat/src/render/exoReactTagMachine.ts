import { createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoRefPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { EXO_REACT_VOID_TAGS } from '../constants/EXO_REACT_VOID_TAGS';
import { createExoReactHost } from './createExoReactHost';
import { reconcileExoReactRegion } from './reconcileExoReactRegion';
import { writeExoReactProps } from './writeExoReactProps';

const TAG_MACHINES = new Map<string, TExoMachine<TExoDomNode>>();

export function exoReactTagMachine(tag: string): TExoMachine<TExoDomNode> {
    const known = TAG_MACHINES.get(tag);
    if (known !== undefined) return known;
    const empty = EXO_REACT_VOID_TAGS.has(tag);
    const declaration = createExoSchema((b) => {
        let element!: TExoRefPort;
        let content: TExoChildrenPort | null = null;
        b.el(tag, null, (el) => {
            element = el.refPort();
            if (!empty) content = el.childrenPort();
        });
        return { element, content };
    });
    const { element, content } = declaration.ports;
    const machine = createExoReactHost(
        declaration,
        element,
        content === null ? [] : [content],
        [],
        [],
        (_c, { props, ref }, state) => {
            const region = state.regions[0];
            const html = props.dangerouslySetInnerHTML !== undefined;
            if (html && region !== undefined && region.slots.length > 0) {
                reconcileExoReactRegion(region, null);
            }
            const previous = state.props.children;
            writeExoReactProps(state, props, ref);
            if (region === undefined || html) return;
            const children = props.children;
            const kind = typeof children;
            if (kind === 'string' || kind === 'number') {
                if (region.slots.length > 0) reconcileExoReactRegion(region, null);
                if (previous !== children) {
                    const text = kind === 'string' ? (children as string) : String(children);
                    const was = typeof previous;
                    const first = state.element.firstChild;
                    if ((was === 'string' || was === 'number') && first !== null) {
                        (first as Text).data = text;
                    } else {
                        state.element.textContent = text;
                    }
                }
            } else {
                if (region.slots.length === 0 && state.element.firstChild !== null) {
                    state.element.textContent = '';
                }
                reconcileExoReactRegion(region, children);
            }
            if (tag === 'select' && props.value !== undefined) {
                (state.element as HTMLSelectElement).value = String(props.value);
            }
        },
        tag,
        null
    );
    TAG_MACHINES.set(tag, machine);
    return machine;
}
