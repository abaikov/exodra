import * as t from '@babel/types';
import { readReactEventProp } from './readReactEventProp';
import type { TExoMarkupNames } from './types/TExoMarkupNames';

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
    holder: string | null,
    names: TExoMarkupNames
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
        const handler = names.handler(port);
        if (handler === null) return null;
        return t.jsxAttribute(
            t.jsxIdentifier(readReactEventProp(event)),
            container(t.identifier(handler))
        );
    }
    if (raw === 'ref') {
        if (port === null) return null;
        return t.jsxAttribute(t.jsxIdentifier('ref'), container(t.identifier(names.ref(port))));
    }
    if (raw === 'unsafeHtml') {
        if (port === null) return null;
        return t.jsxAttribute(
            t.jsxIdentifier('dangerouslySetInnerHTML'),
            container(
                t.objectExpression([
                    t.objectProperty(
                        t.identifier('__html'),
                        t.callExpression(t.identifier('String'), [
                            t.logicalExpression(
                                '??',
                                t.identifier(names.value(port)),
                                t.stringLiteral('')
                            ),
                        ])
                    ),
                ])
            )
        );
    }
    const name = REACT_ATTRIBUTE_NAMES[raw] ?? raw;
    if (port !== null) {
        const read = t.identifier(names.value(port));
        const expression =
            name === 'style'
                ? t.callExpression(t.identifier(names.styleOf), [read])
                : t.tsAsExpression(read, t.tsNeverKeyword());
        return t.jsxAttribute(t.jsxIdentifier(name), container(expression));
    }
    const staticName = STATIC_DEFAULTS[name] ?? name;
    if (name === 'style' && value !== null && value !== undefined && t.isStringLiteral(value)) {
        return t.jsxAttribute(t.jsxIdentifier('style'), container(cssObject(value.value)));
    }
    return t.jsxAttribute(t.jsxIdentifier(staticName), value ?? null);
}

export function emitReactMarkup(
    element: t.JSXElement,
    holder: string | null,
    names: TExoMarkupNames
): t.JSXElement {
    const opening = element.openingElement;
    const attributes: t.JSXAttribute[] = [];
    for (const attribute of opening.attributes) {
        if (!t.isJSXAttribute(attribute)) continue;
        const emitted = emitAttribute(attribute, holder, names);
        if (emitted !== null) attributes.push(emitted);
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
            if (port !== null) {
                children.push(
                    container(
                        t.tsAsExpression(
                            t.identifier(names.value(port)),
                            t.tsTypeReference(t.identifier('ReactNode'))
                        )
                    )
                );
            }
            continue;
        }
        if (t.isJSXElement(child)) {
            const tag = child.openingElement.name;
            if (
                holder !== null &&
                t.isJSXMemberExpression(tag) &&
                t.isJSXIdentifier(tag.object, { name: holder })
            ) {
                children.push(
                    container(
                        t.tsAsExpression(
                            t.identifier(names.value(tag.property.name)),
                            t.tsTypeReference(t.identifier('ReactNode'))
                        )
                    )
                );
                continue;
            }
            children.push(emitReactMarkup(child, holder, names));
        }
    }
    const name = t.jsxIdentifier((opening.name as t.JSXIdentifier).name);
    const selfClosing = children.length === 0;
    return t.jsxElement(
        t.jsxOpeningElement(name, attributes, selfClosing),
        selfClosing ? null : t.jsxClosingElement(t.jsxIdentifier(name.name)),
        children,
        selfClosing
    );
}
