import { exoContextFrame, provideExoIds, readExoContext } from '@exodra/context';
import type { TExoContextFrame, TExoContextToken } from '@exodra/context';
import { EXO_REACT_RENDER } from './constants/EXO_REACT_RENDER';
import type { TExoReactRootOptions } from './types/TExoReactRootOptions';
import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import { EXO_REACT_VOID_TAGS } from './constants/EXO_REACT_VOID_TAGS';
import { Fragment } from './Fragment';
import { isValidElement } from './isValidElement';
import { readExoReactAttributeName } from './readExoReactAttributeName';
import type { TExoReactContext } from './types/TExoReactContext';
import type { TExoReactSlot } from './types/TExoReactSlot';

const UNITLESS =
    /^(flex|flexGrow|flexShrink|fontWeight|lineHeight|opacity|order|zIndex|zoom|gridRow|gridColumn|columnCount|tabSize|orphans|widows|fillOpacity|strokeOpacity|strokeWidth)$/;

function escapeText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
    return escapeText(value).replace(/"/g, '&quot;');
}

function styleText(style: Readonly<Record<string, unknown>>): string {
    let out = '';
    for (const name in style) {
        const value = style[name];
        if (value === null || value === undefined || typeof value === 'boolean' || value === '')
            continue;
        const property = name.startsWith('--')
            ? name
            : name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
        const text =
            typeof value === 'number' && value !== 0 && !UNITLESS.test(name)
                ? value + 'px'
                : String(value);
        out += `${out === '' ? '' : ';'}${property}:${text}`;
    }
    return out;
}

function makeSlot(type: unknown, props: unknown, parent: TExoReactSlot | null): TExoReactSlot {
    return {
        kind: 'component',
        type,
        key: '',
        props,
        ref: null,
        node: null,
        text: null,
        range: null,
        parentRange: null as never,
        parentComponent: parent,
        depth: parent === null ? 1 : parent.depth + 1,
        hooks: [],
        consumers: null,
        dirty: false,
        alive: false,
        pass: 0,
    };
}

function renderComponent(
    type: (props: unknown) => unknown,
    props: unknown,
    slot: TExoReactSlot
): unknown {
    const render = EXO_REACT_RENDER;
    const outerSlot = render.slot;
    const outerHook = render.hook;
    render.slot = slot;
    render.hook = 0;
    try {
        return type(props);
    } finally {
        render.slot = outerSlot;
        render.hook = outerHook;
    }
}

function renderNode(node: unknown, parent: TExoReactSlot | null, svg: boolean): string {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string') return escapeText(node);
    if (typeof node === 'number' || typeof node === 'bigint') return String(node);
    if (Array.isArray(node)) {
        let out = '';
        for (const child of node) out += renderNode(child, parent, svg);
        return out;
    }
    if (!isValidElement(node)) return '';
    const type = node.type;
    const props = node.props as Record<string, unknown>;
    if (typeof type === 'string') return renderHost(type, props, parent, svg || type === 'svg');
    if (type === Fragment) return renderNode(props.children, parent, svg);
    if (typeof type === 'function') {
        const slot = makeSlot(type, props, parent);
        if ((type as { isReactComponent?: boolean }).isReactComponent === true) {
            const Class = type as unknown as new (props: unknown) => {
                render(): unknown;
                state: unknown;
            };
            const instance = new Class(props);
            const derive = (
                type as { getDerivedStateFromProps?: (p: unknown, s: unknown) => unknown }
            ).getDerivedStateFromProps;
            if (derive !== undefined) {
                instance.state = {
                    ...(instance.state as object),
                    ...(derive(props, instance.state) as object),
                };
            }
            return renderNode(instance.render(), slot, svg);
        }
        return renderNode(renderComponent(type as (p: unknown) => unknown, props, slot), slot, svg);
    }
    const tagged = type as {
        $$typeof?: symbol;
        type?: unknown;
        render?: (p: unknown, r: unknown) => unknown;
        context?: TExoReactContext<unknown>;
    };
    if (tagged.$$typeof === EXO_REACT_SYMBOLS.memo) {
        return renderNode({ ...node, type: tagged.type }, parent, svg);
    }
    if (tagged.$$typeof === EXO_REACT_SYMBOLS.forwardRef) {
        const slot = makeSlot(type, props, parent);
        const render = tagged.render as (p: unknown, r: unknown) => unknown;
        return renderNode(
            renderComponent((p) => render(p, node.ref), props, slot),
            slot,
            svg
        );
    }
    if (
        tagged.$$typeof === EXO_REACT_SYMBOLS.provider ||
        tagged.$$typeof === EXO_REACT_SYMBOLS.context
    ) {
        return renderNode(props.children, makeSlot(type, props, parent), svg);
    }
    if (tagged.$$typeof === EXO_REACT_SYMBOLS.consumer) {
        const context = tagged.context as TExoReactContext<unknown>;
        let value = context.defaultValue;
        for (let up = parent; up !== null; up = up.parentComponent) {
            if (up.type === context.Provider || up.type === context) {
                value = (up.props as { value: unknown }).value;
                break;
            }
        }
        return renderNode((props.children as (v: unknown) => unknown)(value), parent, svg);
    }
    return '';
}

function renderHost(
    tag: string,
    props: Readonly<Record<string, unknown>>,
    parent: TExoReactSlot | null,
    svg: boolean
): string {
    let attributes = '';
    let inner: string | null = null;
    for (const name in props) {
        const value = props[name];
        if (name === 'children' || name === 'key' || name === 'ref') continue;
        if (name === 'dangerouslySetInnerHTML') {
            const html = (value as { __html?: unknown } | null)?.__html;
            inner = html === null || html === undefined ? '' : String(html);
            continue;
        }
        if (name.length > 2 && name[0] === 'o' && name[1] === 'n' && /[A-Z]/.test(name[2]))
            continue;
        if (value === null || value === undefined || typeof value === 'function') continue;
        const attribute =
            name === 'defaultValue'
                ? 'value'
                : name === 'defaultChecked'
                ? 'checked'
                : readExoReactAttributeName(name, svg);
        if (name === 'style' && typeof value === 'object') {
            const text = styleText(value as Record<string, unknown>);
            if (text !== '') attributes += ` style="${escapeAttribute(text)}"`;
            continue;
        }
        if (value === false && !/^(aria|data)-/.test(attribute)) continue;
        attributes +=
            value === true
                ? ` ${attribute}=""`
                : ` ${attribute}="${escapeAttribute(String(value))}"`;
    }
    if (EXO_REACT_VOID_TAGS.has(tag)) return `<${tag}${attributes}/>`;
    const content = inner ?? renderNode(props.children, parent, svg);
    return `<${tag}${attributes}>${content}</${tag}>`;
}

export function renderToString(element: unknown, options: TExoReactRootOptions = {}): string {
    const render = EXO_REACT_RENDER;
    const queues = [
        render.insertionEffects,
        render.refs,
        render.layoutEffects,
        render.passiveEffects,
    ];
    const marks = queues.map((queue) => queue.length);
    const outerIdOwner = render.idOwner;
    const idOwner = {
        context: null as TExoContextFrame | null,
        provide<TValue>(key: TExoContextToken<TValue>, value: TValue): void {
            this.context = exoContextFrame(this.context, key, value);
        },
        inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined {
            return readExoContext(this.context, key);
        },
    };
    provideExoIds(idOwner, `:${options.identifierPrefix ?? ''}r`);
    render.idOwner = idOwner;
    try {
        return renderNode(element, null, false);
    } finally {
        render.idOwner = outerIdOwner;
        queues.forEach((queue, i) => {
            queue.length = marks[i];
        });
    }
}
