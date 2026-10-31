import * as t from '@babel/types';
import { cleanJsxText } from './cleanJsxText';
import { readPortName } from './readPortName';
import { readStaticAttribute } from './readStaticAttribute';
import type { TExoDeclarationWalk } from './types/TExoDeclarationWalk';

const PLAIN_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

type TExoDeclaredKid =
    | { kind: 'text'; value: string }
    | { kind: 'element'; node: t.JSXElement }
    | { kind: 'childrenPort'; name: string }
    | { kind: 'textPort'; name: string };

function tagText(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string {
    if (t.isJSXIdentifier(name)) return name.name;
    if (t.isJSXMemberExpression(name)) return `${tagText(name.object)}.${name.property.name}`;
    return `${name.namespace.name}:${name.name.name}`;
}

function propKey(key: string): t.Identifier | t.StringLiteral {
    return PLAIN_KEY.test(key) ? t.identifier(key) : t.stringLiteral(key);
}

function cursorCall(cursor: string, method: string, args: readonly t.Expression[]): t.Statement {
    return t.expressionStatement(
        t.callExpression(t.memberExpression(t.identifier(cursor), t.identifier(method)), [...args])
    );
}

function claimPortName(name: string, walk: TExoDeclarationWalk): t.StringLiteral {
    if (walk.portNames.has(name)) {
        throw new Error(
            `Exodra JSX: the port "${name}" is declared twice. A port is ONE place in the markup; ` +
                'two places that show the same value are two ports the machine writes.'
        );
    }
    walk.portNames.add(name);
    return t.stringLiteral(name);
}

function readAttributePortName(
    label: string,
    tag: string,
    value: t.JSXAttribute['value'],
    walk: TExoDeclarationWalk
): string {
    const expression =
        value !== null && value !== undefined && t.isJSXExpressionContainer(value)
            ? value.expression
            : null;
    const name = expression === null ? null : readPortName(expression, walk.holder);
    if (name === null) {
        throw new Error(
            `Exodra JSX: ${label} on <${tag}> takes a port — write ${label}={$.name}. A ` +
                'declaration holds markup and named ports only; what the port shows is written ' +
                'by the machine, c.attr(P.name, …) / c.on(P.name, …), never by the markup.'
        );
    }
    return name;
}

function refuseExpression(where: string): never {
    throw new Error(
        `Exodra JSX: ${where} is an expression, and a declaration holds markup and named ports ` +
            'only. Write a literal for markup, or name a port with $.name and fill it from the ' +
            'machine.'
    );
}

function isChildrenPortTag(
    name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName,
    holder: string | null
): name is t.JSXMemberExpression {
    return (
        holder !== null &&
        t.isJSXMemberExpression(name) &&
        t.isJSXIdentifier(name.object) &&
        name.object.name === holder
    );
}

function readChildrenPortTag(el: t.JSXElement, label: string): void {
    if (el.openingElement.attributes.length > 0) {
        throw new Error(
            `Exodra JSX: <${label} /> is a children port and takes no attributes — what stands ` +
                'there is built by the machine: c.one, c.list or c.childList(P.name).'
        );
    }
    for (const child of el.children) {
        if (t.isJSXText(child) && cleanJsxText(child.value) === '') continue;
        throw new Error(
            `Exodra JSX: <${label} /> is a children port and takes no children — what stands ` +
                'there is built by the machine.'
        );
    }
}

function collectKids(el: t.JSXElement, tag: string, walk: TExoDeclarationWalk): TExoDeclaredKid[] {
    const out: TExoDeclaredKid[] = [];
    for (const child of el.children) {
        if (t.isJSXText(child)) {
            const value = cleanJsxText(child.value);
            if (value !== '') out.push({ kind: 'text', value });
            continue;
        }
        if (t.isJSXElement(child)) {
            const name = child.openingElement.name;
            if (isChildrenPortTag(name, walk.holder)) {
                const label = tagText(name);
                readChildrenPortTag(child, label);
                out.push({ kind: 'childrenPort', name: name.property.name });
                continue;
            }
            if (!t.isJSXIdentifier(name) || /^[A-Z]/.test(name.name)) {
                throw new Error(
                    `Exodra JSX: <${tagText(name)}> is not an element, and a declaration has no ` +
                        'components. Declare a children port where its instances stand, ' +
                        '<$.rows />, and build them from the machine.'
                );
            }
            out.push({ kind: 'element', node: child });
            continue;
        }
        if (t.isJSXExpressionContainer(child)) {
            const expression = child.expression;
            if (t.isJSXEmptyExpression(expression)) continue;
            const name = readPortName(expression, walk.holder);
            if (name === null) refuseExpression(`{…} inside <${tag}>`);
            out.push({ kind: 'textPort', name });
            continue;
        }
        if (t.isJSXFragment(child)) {
            throw new Error(
                'Exodra JSX: a fragment has no place in a declaration — every node of a schema ' +
                    'is an element, text or a port.'
            );
        }
        throw new Error(`Exodra JSX: unsupported child inside <${tag}>.`);
    }
    return out;
}

export function emitDeclaredElement(
    el: t.JSXElement,
    parent: string,
    depth: number,
    walk: TExoDeclarationWalk
): t.Statement {
    const opening = el.openingElement;
    const name = opening.name;
    if (!t.isJSXIdentifier(name)) {
        throw new Error(
            `Exodra JSX: <${tagText(name)}> is not an element tag. A declared node is a plain ` +
                'element name.'
        );
    }
    const tag = name.name;
    const cursor = `${walk.cursor}${depth}`;
    const statics: t.ObjectProperty[] = [];
    const body: t.Statement[] = [];
    let contentTaken = false;

    for (const attr of opening.attributes) {
        if (!t.isJSXAttribute(attr)) {
            throw new Error(
                `Exodra JSX: {...spread} on <${tag}> — every attribute is read at build time to ` +
                    'decide whether it is markup or a port.'
            );
        }
        const attrName = attr.name;
        if (t.isJSXNamespacedName(attrName)) {
            const namespace = attrName.namespace.name;
            const event = attrName.name.name;
            if (namespace !== 'on') {
                throw new Error(
                    `Exodra JSX: "${namespace}:${event}" on <${tag}> — the one namespace is on:, ` +
                        `for event ports. An attribute port is ${event}={$.name}.`
                );
            }
            const label = `on:${event}`;
            const port = readAttributePortName(label, tag, attr.value, walk);
            body.push(
                cursorCall(cursor, 'eventPort', [t.stringLiteral(event), claimPortName(port, walk)])
            );
            continue;
        }
        const key = attrName.name;
        if (/^on[A-Z]/.test(key)) {
            const port = readAttributePortName(key, tag, attr.value, walk);
            body.push(
                cursorCall(cursor, 'eventPort', [
                    t.stringLiteral(key.slice(2).toLowerCase()),
                    claimPortName(port, walk),
                ])
            );
            continue;
        }
        if (/^on[a-z]/.test(key)) {
            throw new Error(
                `Exodra JSX: "${key}" on <${tag}> is an inline HTML handler — a string of script ` +
                    `in the markup. Declare an event port: on${key[2].toUpperCase()}${key.slice(
                        3
                    )}={$.name}, or on:${key.slice(2)}={$.name} for an event name kept as written.`
            );
        }
        if (key === 'ref') {
            const port = readAttributePortName(key, tag, attr.value, walk);
            body.push(cursorCall(cursor, 'refPort', [claimPortName(port, walk)]));
            continue;
        }
        if (key === 'unsafeHtml') {
            const port = readAttributePortName(key, tag, attr.value, walk);
            body.push(cursorCall(cursor, 'childrenPort', [claimPortName(port, walk)]));
            contentTaken = true;
            continue;
        }
        const literal = readStaticAttribute(attr.value);
        if (literal !== null) {
            statics.push(t.objectProperty(propKey(key), literal));
            continue;
        }
        const value = attr.value;
        const expression = t.isJSXExpressionContainer(value) ? value.expression : null;
        const port = expression === null ? null : readPortName(expression, walk.holder);
        if (port === null) refuseExpression(`${key}={…} on <${tag}>`);
        body.push(cursorCall(cursor, 'port', [t.stringLiteral(key), claimPortName(port, walk)]));
    }

    const kids = collectKids(el, tag, walk);
    if (contentTaken && kids.length > 0) {
        throw new Error(
            `Exodra JSX: <${tag}> has unsafeHtml={…} and children. unsafeHtml stands for ` +
                'EVERYTHING inside its element, so it cannot share the element with anything else.'
        );
    }
    const textPort = kids.find(
        (kid): kid is { kind: 'textPort'; name: string } => kid.kind === 'textPort'
    );
    if (textPort !== undefined && kids.length > 1) {
        throw new Error(
            `Exodra JSX: {$.${textPort.name}} inside <${tag}> stands beside other children. A ` +
                "text port is its element's whole content, so text that varies goes in an " +
                `element of its own: <span>{$.${textPort.name}}</span>.`
        );
    }

    for (const kid of kids) {
        if (kid.kind === 'text') {
            body.push(cursorCall(cursor, 'text', [t.stringLiteral(kid.value)]));
        } else if (kid.kind === 'element') {
            body.push(emitDeclaredElement(kid.node, cursor, depth + 1, walk));
        } else if (kid.kind === 'textPort') {
            body.push(cursorCall(cursor, 'textPort', [claimPortName(kid.name, walk)]));
        } else {
            body.push(cursorCall(cursor, 'childrenPort', [claimPortName(kid.name, walk)]));
        }
    }

    const args: t.Expression[] = [t.stringLiteral(tag)];
    if (statics.length > 0) args.push(t.objectExpression(statics));
    else if (body.length > 0) args.push(t.nullLiteral());
    if (body.length > 0) {
        args.push(t.arrowFunctionExpression([t.identifier(cursor)], t.blockStatement(body)));
    }
    return t.expressionStatement(
        t.callExpression(t.memberExpression(t.identifier(parent), t.identifier('el')), args)
    );
}
