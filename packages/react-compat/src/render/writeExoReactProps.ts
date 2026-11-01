import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';
import { readExoReactAttributeName } from '../readExoReactAttributeName';
import { createExoReactSyntheticEvent } from './createExoReactSyntheticEvent';
import { readExoReactEventName } from '../readExoReactEventName';
import type { TExoReactHostState } from '../types/TExoReactHostState';

const UNITLESS =
    /^(animationIterationCount|aspectRatio|borderImageOutset|borderImageSlice|borderImageWidth|boxFlex|boxFlexGroup|boxOrdinalGroup|columnCount|columns|flex|flexGrow|flexPositive|flexShrink|flexNegative|flexOrder|gridArea|gridRow|gridRowEnd|gridRowSpan|gridRowStart|gridColumn|gridColumnEnd|gridColumnSpan|gridColumnStart|fontWeight|lineClamp|lineHeight|opacity|order|orphans|scale|tabSize|widows|zIndex|zoom|fillOpacity|floodOpacity|stopOpacity|strokeDasharray|strokeDashoffset|strokeMiterlimit|strokeOpacity|strokeWidth)$/;

const PROPERTY_ATTRIBUTES =
    /^(width|height|href|list|form|tabIndex|download|rowSpan|colSpan|role|popover)$/;

function styleValue(name: string, value: unknown): string {
    if (value === null || value === undefined || typeof value === 'boolean') return '';
    if (typeof value === 'number' && value !== 0 && !UNITLESS.test(name) && name[0] !== '-') {
        return value + 'px';
    }
    return String(value);
}

function writeStyle(element: HTMLElement, value: unknown, previous: unknown): void {
    const style = element.style;
    if (typeof value === 'string') {
        style.cssText = value;
        return;
    }
    if (typeof previous === 'string') style.cssText = '';
    const before =
        typeof previous === 'object' && previous !== null
            ? (previous as Record<string, unknown>)
            : null;
    const after =
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
    if (before !== null) {
        for (const name in before) {
            if (after !== null && name in after) continue;
            if (name.startsWith('--')) style.removeProperty(name);
            else (style as unknown as Record<string, string>)[name] = '';
        }
    }
    if (after === null) return;
    for (const name in after) {
        const next = after[name];
        if (before !== null && before[name] === next) continue;
        if (name.startsWith('--')) style.setProperty(name, styleValue(name, next));
        else (style as unknown as Record<string, string>)[name] = styleValue(name, next);
    }
}

function controlValue(state: TExoReactHostState, element: Element): void {
    const props = state.props;
    const field = element as HTMLInputElement;
    if ('value' in props && props.value !== undefined && field.value !== String(props.value)) {
        field.value = String(props.value ?? '');
    }
    if ('checked' in props && props.checked !== undefined && field.checked !== props.checked) {
        field.checked = props.checked === true;
    }
}

function writeListener(
    state: TExoReactHostState,
    element: Element,
    name: string,
    value: unknown
): void {
    const tag = element.localName;
    const event = readExoReactEventName(name, tag);
    const capture = name.endsWith('Capture');
    const listeners = (state.listeners ??= {});
    const slot = capture ? event + '!' : event;
    const had = slot in listeners;
    listeners[slot] = value;
    if (had) return;
    const controlled = tag === 'input' || tag === 'textarea' || tag === 'select';
    element.addEventListener(
        event,
        (domEvent) => {
            const handler = listeners[slot];
            if (typeof handler === 'function') {
                handler(createExoReactSyntheticEvent(domEvent, element));
            }
            if (controlled) queueMicrotask(() => controlValue(state, element));
        },
        capture
    );
}

function writeProp(
    state: TExoReactHostState,
    element: Element,
    name: string,
    value: unknown,
    previous: unknown
): void {
    if (name === 'style') {
        writeStyle(element as HTMLElement, value, previous);
        return;
    }
    if (name === 'dangerouslySetInnerHTML') {
        const html = (value as { __html?: unknown } | null | undefined)?.__html;
        element.innerHTML = html === null || html === undefined ? '' : String(html);
        return;
    }
    if (name.length > 2 && name[0] === 'o' && name[1] === 'n' && name[2] >= 'A' && name[2] <= 'Z') {
        writeListener(state, element, name, value);
        return;
    }
    if (name === 'defaultValue' || name === 'defaultChecked') {
        if (previous === undefined) {
            (element as unknown as Record<string, unknown>)[
                name === 'defaultValue' ? 'value' : 'checked'
            ] = value;
        }
        return;
    }
    const svg = element.namespaceURI === 'http://www.w3.org/2000/svg';
    const attribute = readExoReactAttributeName(name, svg);
    if (!svg && attribute === name && name in element && !PROPERTY_ATTRIBUTES.test(name)) {
        if (
            (value === null || value === undefined) &&
            typeof (element as unknown as Record<string, unknown>)[name] === 'string'
        ) {
            element.removeAttribute(attribute);
            return;
        }
        try {
            (element as unknown as Record<string, unknown>)[name] =
                value === null || value === undefined ? '' : value;
            return;
        } catch {
            void 0;
        }
    }
    if (
        value === null ||
        value === undefined ||
        (value === false && !attribute.startsWith('aria-') && !attribute.startsWith('data-'))
    ) {
        element.removeAttribute(attribute);
        return;
    }
    if (typeof value === 'function' || typeof value === 'symbol') return;
    const stringly = attribute.startsWith('aria-') || attribute.startsWith('data-');
    element.setAttribute(attribute, value === true && !stringly ? '' : String(value));
}

function writeRef(ref: unknown, element: Element | null): void {
    if (typeof ref === 'function') ref(element);
    else if (typeof ref === 'object' && ref !== null)
        (ref as { current: unknown }).current = element;
}

export function writeExoReactProps(
    state: TExoReactHostState,
    props: Readonly<Record<string, unknown>>,
    ref: unknown
): void {
    const nextRef = ref ?? null;
    if (nextRef !== state.ref) {
        const previousRef = state.ref;
        const target = state.element;
        state.ref = nextRef;
        EXO_REACT_RENDER.refs.push((): void => {
            if (previousRef !== null) writeRef(previousRef, null);
            if (nextRef !== null) writeRef(nextRef, target);
        });
    }
    const element = state.element;
    const previous = state.props;
    for (const name in previous) {
        if (name === 'children' || name in props) continue;
        writeProp(state, element, name, null, previous[name]);
    }
    for (const name in props) {
        if (name === 'children') continue;
        const value = props[name];
        const before = previous[name];
        if (value === before && name !== 'value' && name !== 'checked') continue;
        if ((name === 'value' || name === 'checked') && name in element) {
            const live = (element as unknown as Record<string, unknown>)[name];
            const next = name === 'value' ? String(value ?? '') : value === true;
            if (live === next) continue;
        }
        writeProp(state, element, name, value, before);
    }
    state.props = props;
}
