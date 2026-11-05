import * as t from '@babel/types';
import { readReactEventProp } from './readReactEventProp';
import type { TExoElementPortsSource } from './types/TExoElementPortsSource';

const REACT_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
    class: 'className',
    for: 'htmlFor',
    tabindex: 'tabIndex',
    readonly: 'readOnly',
    maxlength: 'maxLength',
    minlength: 'minLength',
    colspan: 'colSpan',
    rowspan: 'rowSpan',
    autofocus: 'autoFocus',
    autocomplete: 'autoComplete',
    contenteditable: 'contentEditable',
    spellcheck: 'spellCheck',
    enterkeyhint: 'enterKeyHint',
    inputmode: 'inputMode',
    crossorigin: 'crossOrigin',
    srcset: 'srcSet',
    accesskey: 'accessKey',
};

const STATIC_DEFAULTS: Readonly<Record<string, string>> = {
    value: 'defaultValue',
    checked: 'defaultChecked',
};

const REACT_BOOLEAN_ATTRIBUTES: ReadonlySet<string> = new Set([
    'hidden',
    'disabled',
    'readOnly',
    'required',
    'multiple',
    'open',
    'autoFocus',
    'noValidate',
    'formNoValidate',
    'allowFullScreen',
    'async',
    'defer',
    'controls',
    'loop',
    'muted',
    'playsInline',
    'reversed',
    'default',
    'itemScope',
    'inert',
]);

const CONTROL_PROPERTIES: Readonly<Record<string, ReadonlySet<string>>> = {
    input: new Set(['value', 'checked', 'indeterminate']),
    textarea: new Set(['value']),
    select: new Set(['value']),
    option: new Set(['selected']),
};

function portOf(expression: t.Node, holder: string | null): string | null {
    if (holder === null || !t.isMemberExpression(expression)) return null;
    if (!t.isIdentifier(expression.object, { name: holder })) return null;
    if (!expression.computed && t.isIdentifier(expression.property))
        return expression.property.name;
    if (expression.computed && t.isStringLiteral(expression.property))
        return expression.property.value;
    return null;
}

function container(expression: t.Expression): t.JSXExpressionContainer {
    return t.jsxExpressionContainer(expression);
}

function read(view: string, method: string, argument: string | number): t.CallExpression {
    return t.callExpression(t.memberExpression(t.identifier(view), t.identifier(method)), [
        typeof argument === 'number' ? t.numericLiteral(argument) : t.stringLiteral(argument),
    ]);
}

function cssObject(text: string): t.ObjectExpression {
    const properties: t.ObjectProperty[] = [];
    for (const declaration of text.split(';')) {
        const at = declaration.indexOf(':');
        if (at === -1) continue;
        const name = declaration.slice(0, at).trim();
        const value = declaration.slice(at + 1).trim();
        if (name === '') continue;
        const key = name.startsWith('--')
            ? name
            : name.replace(/-([a-z])/g, (_all, letter: string) => letter.toUpperCase());
        properties.push(
            t.objectProperty(
                /^[A-Za-z_$][\w$]*$/.test(key) ? t.identifier(key) : t.stringLiteral(key),
                t.stringLiteral(value)
            )
        );
    }
    return t.objectExpression(properties);
}

function emitAttribute(
    attribute: t.JSXAttribute,
    tag: string,
    holder: string | null,
    view: string,
    ports: TExoElementPortsSource
): t.JSXAttribute | null {
    const raw = t.isJSXIdentifier(attribute.name)
        ? attribute.name.name
        : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
    const value = attribute.value;
    const port =
        value !== null && value !== undefined && t.isJSXExpressionContainer(value)
            ? portOf(value.expression, holder)
            : null;
    if (raw.startsWith('on:') || /^on[A-Z]/.test(raw)) {
        if (port === null) return null;
        const event = raw.startsWith('on:') ? raw.slice(3) : raw.slice(2).toLowerCase();
        return t.jsxAttribute(
            t.jsxIdentifier(readReactEventProp(event)),
            container(read(view, 'on', port))
        );
    }
    if (raw === 'ref') {
        if (port !== null) ports.ref = port;
        return null;
    }
    if (raw === 'unsafeHtml') {
        if (port === null) return null;
        return t.jsxAttribute(
            t.jsxIdentifier('dangerouslySetInnerHTML'),
            container(read(view, 'html', port))
        );
    }
    const name = REACT_ATTRIBUTE_NAMES[raw] ?? raw;
    if (port !== null) {
        if (CONTROL_PROPERTIES[tag]?.has(name) === true) {
            ports.props.push([port, name]);
            return null;
        }
        const method =
            name === 'style'
                ? 'style'
                : name === 'className'
                ? 'className'
                : REACT_BOOLEAN_ATTRIBUTES.has(name)
                ? 'flag'
                : 'attr';
        const expression = read(view, method, port);
        return t.jsxAttribute(
            t.jsxIdentifier(name),
            container(
                method === 'attr' ? t.tsAsExpression(expression, t.tsNeverKeyword()) : expression
            )
        );
    }
    const staticName = STATIC_DEFAULTS[name] ?? name;
    if (name === 'style' && value !== null && value !== undefined) {
        const style = t.isJSXExpressionContainer(value) ? value.expression : value;
        if (t.isStringLiteral(style)) {
            return t.jsxAttribute(t.jsxIdentifier('style'), container(cssObject(style.value)));
        }
        if (t.isExpression(style)) {
            return t.jsxAttribute(
                t.jsxIdentifier('style'),
                container(t.callExpression(t.identifier('exoStyleObject'), [style]))
            );
        }
    }
    return t.jsxAttribute(t.jsxIdentifier(staticName), value ?? null);
}

export function emitReactMarkup(
    element: t.JSXElement,
    holder: string | null,
    view: string,
    elements: TExoElementPortsSource[],
    runtime: Set<string>
): t.JSXElement {
    const opening = element.openingElement;
    const tag = (opening.name as t.JSXIdentifier).name;
    const ports: TExoElementPortsSource = { ref: null, props: [] };
    const attributes: t.JSXAttribute[] = [];
    for (const attribute of opening.attributes) {
        if (!t.isJSXAttribute(attribute)) continue;
        const emitted = emitAttribute(attribute, tag, holder, view, ports);
        if (emitted !== null) {
            attributes.push(emitted);
            if (
                t.isJSXExpressionContainer(emitted.value) &&
                t.isCallExpression(emitted.value.expression) &&
                t.isIdentifier(emitted.value.expression.callee, { name: 'exoStyleObject' })
            ) {
                runtime.add('exoStyleObject');
            }
        }
    }
    if (ports.ref !== null || ports.props.length > 0) {
        attributes.push(
            t.jsxAttribute(
                t.jsxIdentifier('ref'),
                container(read(view, 'element', elements.length))
            )
        );
        elements.push(ports);
    }
    const children: t.JSXElement['children'] = [];
    for (const child of element.children) {
        if (t.isJSXText(child)) {
            children.push(t.jsxText(child.value));
            continue;
        }
        if (t.isJSXExpressionContainer(child)) {
            if (t.isJSXEmptyExpression(child.expression)) continue;
            const port = portOf(child.expression, holder);
            if (port !== null) children.push(container(read(view, 'text', port)));
            continue;
        }
        if (t.isJSXElement(child)) {
            const childTag = child.openingElement.name;
            if (
                holder !== null &&
                t.isJSXMemberExpression(childTag) &&
                t.isJSXIdentifier(childTag.object, { name: holder })
            ) {
                children.push(container(read(view, 'children', childTag.property.name)));
                continue;
            }
            children.push(emitReactMarkup(child, holder, view, elements, runtime));
        }
    }
    const name = t.jsxIdentifier(tag);
    const selfClosing = children.length === 0;
    return t.jsxElement(
        t.jsxOpeningElement(name, attributes, selfClosing),
        selfClosing ? null : t.jsxClosingElement(t.jsxIdentifier(tag)),
        children,
        selfClosing
    );
}
