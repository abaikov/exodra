import { createExoSchema } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoRefPort,
    TExoSchemaCursor,
    TExoTextPort,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { readExoReactAttributeName } from '../readExoReactAttributeName';
import { readExoReactEventName } from '../readExoReactEventName';
import { createExoReactHost } from './createExoReactHost';
import { isExoReactTemplateHost } from './isExoReactTemplateHost';
import { reconcileExoReactRegion } from './reconcileExoReactRegion';
import { writeExoReactProps } from './writeExoReactProps';
import type { TExoReactElement } from '../types/TExoReactElement';
import type { TExoReactHostShape } from '../types/TExoReactHostShape';
import type { TExoReactHostShapeKid } from '../types/TExoReactHostShapeKid';
import type { TExoReactHostState } from '../types/TExoReactHostState';
import type { TExoReactHostTemplate } from '../types/TExoReactHostTemplate';
import type { TExoReactHostTemplateKind } from '../types/TExoReactHostTemplateKind';
import type { TExoReactHostTemplateNode } from '../types/TExoReactHostTemplateNode';
import type { TExoReactHostTemplateOp } from '../types/TExoReactHostTemplateOp';
import type { TExoReactHostTemplatePlan } from '../types/TExoReactHostTemplatePlan';

const PART_PROPS =
    /^(style|value|checked|selected|defaultValue|defaultChecked|muted|indeterminate|dangerouslySetInnerHTML)$/;

function isControlled(node: TExoReactHostTemplateNode): boolean {
    return node.tag === 'input' && (node.props.includes('value') || node.props.includes('checked'));
}

function isPartProp(name: string, controlled: boolean): boolean {
    const event =
        name.length > 2 && name[0] === 'o' && name[1] === 'n' && name[2] >= 'A' && name[2] <= 'Z';
    return event ? controlled || name.endsWith('Capture') : PART_PROPS.test(name);
}

function shapeOf(node: TExoReactHostTemplateNode, next: { value: number }): TExoReactHostShape {
    const controlled = isControlled(node);
    const values = node.props.map(() => next.value++);
    const ref = node.ref ? next.value++ : -1;
    const kids: TExoReactHostShapeKid[] = [];
    if (!node.html && node.wholeRegion) {
        kids.push({ kind: 'region', value: next.value++, width: 0, whole: true });
    } else if (!node.html) {
        for (let i = 0; i < node.kinds.length; ) {
            const kind = node.kinds[i];
            if (kind === 'host') {
                kids.push({
                    kind: 'host',
                    shape: shapeOf(node.nested[i] as TExoReactHostTemplateNode, next),
                });
                i++;
            } else if (kind === 'text') {
                kids.push({ kind: 'text', value: next.value++, text: '', width: 1 });
                i++;
            } else {
                const end = node.runEnd[i];
                kids.push({ kind: 'region', value: next.value++, width: end - i, whole: false });
                i = end;
            }
        }
    }
    return {
        tag: node.tag,
        key: node.key,
        props: node.props,
        values,
        statics: [],
        ref,
        part: node.ref || node.props.some((name) => isPartProp(name, controlled)),
        html: node.html,
        kids,
    };
}

function isListOf(children: unknown): boolean {
    if (!Array.isArray(children)) return false;
    let keyed = children.length > 0;
    let type: unknown = undefined;
    for (let i = 0; i < children.length; i++) {
        const kid = children[i] as { readonly key?: unknown; readonly type?: unknown } | null;
        if (Array.isArray(kid)) return true;
        if (!keyed) continue;
        if (typeof kid !== 'object' || kid === null || kid.key === null || kid.key === undefined) {
            keyed = false;
        } else if (type === undefined) {
            type = kid.type;
        } else if (kid.type !== type) {
            keyed = false;
        }
    }
    return keyed;
}

function kindOf(kid: unknown): TExoReactHostTemplateKind {
    if (isExoReactTemplateHost(kid)) return 'host';
    const type = typeof kid;
    return type === 'string' || type === 'number' ? 'text' : 'region';
}

function nodeOf(
    element: TExoReactElement,
    hint: TExoReactHostTemplateNode | null
): TExoReactHostTemplateNode {
    const props = element.props;
    const html = props.dangerouslySetInnerHTML !== undefined;
    const like = hint !== null && hint.tag === element.type && hint.html === html ? hint : null;
    const names: string[] = [];
    for (const name in props) if (name !== 'children') names.push(name);
    if (like !== null) {
        for (let i = 0; i < like.props.length; i++) {
            if (!names.includes(like.props[i])) names.push(like.props[i]);
        }
    }
    const children = props.children;
    const count = children === undefined ? 0 : Array.isArray(children) ? children.length : 1;
    const wholeRegion =
        !html &&
        (isListOf(children) ||
            (like !== null && (like.wholeRegion || like.kinds.length !== count)));
    const kinds: TExoReactHostTemplateKind[] = [];
    const nested: (TExoReactHostTemplateNode | null)[] = [];
    if (!html && !wholeRegion) {
        for (let i = 0; i < count; i++) {
            const kid = Array.isArray(children) ? children[i] : children;
            let kind = kindOf(kid);
            if (kind === 'text' && count > 1) kind = 'region';
            const hinted = like === null ? null : like.nested[i];
            if (like !== null && like.kinds[i] !== kind) kind = 'region';
            if (
                kind === 'host' &&
                hinted !== null &&
                (hinted.tag !== (kid as TExoReactElement).type ||
                    hinted.key !== (kid as TExoReactElement).key)
            ) {
                kind = 'region';
            }
            kinds.push(kind);
            nested.push(kind === 'host' ? nodeOf(kid as TExoReactElement, hinted) : null);
        }
    }
    const runEnd: number[] = new Array<number>(kinds.length);
    for (let i = kinds.length - 1; i >= 0; i--) {
        runEnd[i] =
            kinds[i] === 'region' && i + 1 < kinds.length && kinds[i + 1] === 'region'
                ? runEnd[i + 1]
                : i + 1;
    }
    return {
        tag: element.type as string,
        key: element.key,
        props: names,
        ref: element.ref !== null || (like !== null && like.ref),
        html,
        wholeRegion,
        kinds,
        nested,
        runEnd,
    };
}

function walkNode(
    node: TExoReactHostTemplateNode,
    svg: boolean,
    root: boolean,
    cursor: TExoSchemaCursor | null,
    slots: unknown[],
    plan: TExoReactHostTemplatePlan | null
): void {
    const inSvg = svg || node.tag === 'svg';
    const body = (el: TExoSchemaCursor | null): void => {
        const claim = (make: (c: TExoSchemaCursor) => unknown): number => {
            if (el !== null) slots.push(make(el));
            return plan === null ? -1 : plan.claims++;
        };
        if (root) claim((c) => c.refPort());
        const controlled = isControlled(node);
        const base = plan === null ? 0 : plan.value;
        if (plan !== null) plan.value += node.props.length;
        const partNames: string[] = [];
        const partValues: number[] = [];
        for (let i = 0; i < node.props.length; i++) {
            const name = node.props[i];
            const value = base + i;
            const event =
                name.length > 2 &&
                name[0] === 'o' &&
                name[1] === 'n' &&
                name[2] >= 'A' &&
                name[2] <= 'Z';
            if (event && !controlled && !name.endsWith('Capture')) {
                const eventName = readExoReactEventName(name, node.tag);
                const at = claim((c) => c.eventPort(eventName));
                if (plan !== null) {
                    plan.ops.push({
                        op: { kind: 'event', handler: plan.events.length, value },
                        claim: at,
                    });
                    plan.events.push(at);
                }
                continue;
            }
            if (isPartProp(name, controlled)) {
                partNames.push(name);
                partValues.push(value);
                continue;
            }
            const attrName = readExoReactAttributeName(name, inSvg);
            const at = claim((c) => c.port(attrName));
            if (plan !== null) {
                const stringify = name.startsWith('aria-') || name.startsWith('data-');
                plan.ops.push({
                    op: { kind: 'attr', port: null as unknown as TExoAttrPort, value, stringify },
                    claim: at,
                });
            }
        }
        const ref = node.ref ? (plan === null ? 0 : plan.value++) : -1;
        if (partNames.length > 0 || node.ref) {
            const at = claim((c) => c.refPort());
            if (plan !== null) {
                plan.ops.push({
                    op: {
                        kind: 'part',
                        part: plan.parts.length,
                        names: partNames,
                        values: partValues,
                        ref,
                    },
                    claim: at,
                });
                plan.parts.push(at);
            }
        }
        if (node.html) return;
        const region = (): void => {
            const at = claim((c) => c.childrenPort());
            if (plan !== null) {
                plan.ops.push({
                    op: { kind: 'region', region: plan.regions.length, value: plan.value++ },
                    claim: at,
                });
                plan.regions.push(at);
            }
        };
        if (node.wholeRegion) {
            region();
            return;
        }
        for (let i = 0; i < node.kinds.length; ) {
            const kind = node.kinds[i];
            if (kind === 'host') {
                walkNode(
                    node.nested[i] as TExoReactHostTemplateNode,
                    inSvg,
                    false,
                    el,
                    slots,
                    plan
                );
                i++;
            } else if (kind === 'text') {
                const at = claim((c) => c.textPort());
                if (plan !== null) {
                    plan.ops.push({
                        op: {
                            kind: 'text',
                            port: null as unknown as TExoTextPort,
                            value: plan.value++,
                        },
                        claim: at,
                    });
                }
                i++;
            } else {
                region();
                i = node.runEnd[i];
            }
        }
    };
    if (cursor === null) body(null);
    else cursor.el(node.tag, null, (el) => body(el as TExoSchemaCursor));
}

function wireOf(
    ops: readonly TExoReactHostTemplateOp[]
): (c: TExoDomNode, element: TExoReactElement, state: TExoReactHostState) => void {
    return (c, element, state) => {
        const values = (element as unknown as { readonly values: readonly unknown[] }).values;
        const last = state.last;
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            switch (op.kind) {
                case 'attr': {
                    const value = values[op.value];
                    if (last[op.value] !== value) {
                        last[op.value] = value;
                        c.attr(op.port, op.stringify && value != null ? String(value) : value);
                    }
                    break;
                }
                case 'text': {
                    const value = values[op.value];
                    if (last[op.value] !== value) {
                        last[op.value] = value;
                        c.text(op.port, String(value));
                    }
                    break;
                }
                case 'event':
                    (state.handlers as unknown[])[op.handler] = values[op.value];
                    break;
                case 'part': {
                    const props: Record<string, unknown> = {};
                    for (let n = 0; n < op.names.length; n++)
                        props[op.names[n]] = values[op.values[n]];
                    writeExoReactProps(
                        state.parts[op.part],
                        props,
                        op.ref < 0 ? null : values[op.ref]
                    );
                    break;
                }
                case 'region':
                    reconcileExoReactRegion(state.regions[op.region], values[op.value]);
                    break;
            }
        }
    };
}

export function compileExoReactHostTemplate(
    element: TExoReactElement,
    hint: TExoReactHostTemplateNode | null
): TExoReactHostTemplate | null {
    const node = nodeOf(element, hint);
    if (!node.kinds.includes('host')) return null;
    const plan: TExoReactHostTemplatePlan = {
        claims: 0,
        value: 0,
        regions: [],
        events: [],
        parts: [],
        ops: [],
    };
    walkNode(node, false, true, null, [], plan);
    const declaration = createExoSchema((b) => {
        const slots: unknown[] = [];
        walkNode(node, false, true, b, slots, null);
        return slots;
    });
    const ports = declaration.ports as readonly unknown[];
    const ops = plan.ops.map(({ op, claim }): TExoReactHostTemplateOp => {
        if (op.kind === 'attr') return { ...op, port: ports[claim] as TExoAttrPort };
        if (op.kind === 'text') return { ...op, port: ports[claim] as TExoTextPort };
        return op;
    });
    const machine = createExoReactHost(
        declaration,
        ports[0] as TExoRefPort,
        plan.regions.map((at) => ports[at] as TExoChildrenPort),
        plan.events.map((at) => ports[at] as TExoEventPort),
        plan.parts.map((at) => ports[at] as TExoRefPort),
        wireOf(ops),
        node.tag,
        null,
        shapeOf(node, { value: 0 })
    );
    return { machine, node };
}
