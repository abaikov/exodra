import * as t from '@babel/types';
import { readExoReactAttributeName, readExoReactEventName } from '@exodra/react-compat/names';
import { isCompilableHost } from './isCompilableHost';
import type { TExoHostTreeWalk } from './types/TExoHostTreeWalk';

const PART_PROPS =
    /^(style|value|checked|selected|defaultValue|defaultChecked|muted|indeterminate|dangerouslySetInnerHTML|ref)$/;
const CONTROLLED_TAGS = /^(input|textarea|select)$/;
const PLAIN_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function propertyKey(name: string): t.Identifier | t.StringLiteral {
    return PLAIN_KEY.test(name) ? t.identifier(name) : t.stringLiteral(name);
}

function member(object: string, property: string): t.MemberExpression {
    return t.memberExpression(t.identifier(object), t.identifier(property));
}

function at(object: t.Expression, index: number): t.MemberExpression {
    return t.memberExpression(object, t.numericLiteral(index), true);
}

function cursorCall(cursor: string, method: string, args: t.Expression[]): t.CallExpression {
    return t.callExpression(member(cursor, method), args);
}

function claimPort(walk: TExoHostTreeWalk, body: t.Statement[], call: t.CallExpression): string {
    const n = walk.nextPort++;
    const slot = `${walk.names.slot}${n}`;
    const port = `${walk.names.port}${n}`;
    walk.slots.push(slot);
    walk.ports.push(port);
    body.push(t.expressionStatement(t.assignmentExpression('=', t.identifier(slot), call)));
    return port;
}

function readStaticValue(value: t.JSXAttribute['value']): t.Expression | null | undefined {
    if (value === null || value === undefined) return t.booleanLiteral(true);
    if (t.isStringLiteral(value)) return t.stringLiteral(value.value);
    if (!t.isJSXExpressionContainer(value)) return undefined;
    const expression = value.expression;
    if (t.isStringLiteral(expression)) return t.stringLiteral(expression.value);
    if (t.isNumericLiteral(expression)) return t.stringLiteral(String(expression.value));
    if (t.isBooleanLiteral(expression)) return expression.value ? t.booleanLiteral(true) : null;
    return undefined;
}

function readExpression(value: t.JSXAttribute['value']): t.Expression {
    if (value !== null && value !== undefined && t.isJSXExpressionContainer(value)) {
        const expression = value.expression;
        if (!t.isJSXEmptyExpression(expression)) return expression;
    }
    if (value !== null && value !== undefined && !t.isJSXExpressionContainer(value)) return value;
    return t.booleanLiteral(true);
}

function readLiteralKey(element: t.JSXElement): string | null | undefined {
    for (const attribute of element.openingElement.attributes as t.JSXAttribute[]) {
        if ((attribute.name as t.JSXIdentifier).name !== 'key') continue;
        const literal = readStaticValue(attribute.value);
        return t.isStringLiteral(literal) ? literal.value : undefined;
    }
    return null;
}

function shapeKid(kind: string, fields: t.ObjectProperty[]): t.ObjectExpression {
    return t.objectExpression([
        t.objectProperty(t.identifier('kind'), t.stringLiteral(kind)),
        ...fields,
    ]);
}

function field(name: string, value: t.Expression): t.ObjectProperty {
    return t.objectProperty(t.identifier(name), value);
}

function addValue(walk: TExoHostTreeWalk, expression: t.Expression): number {
    walk.values.push(expression);
    return walk.values.length - 1;
}

export function emitHostElement(
    element: t.JSXElement,
    parent: string,
    depth: number,
    svg: boolean,
    walk: TExoHostTreeWalk,
    root: boolean
): {
    readonly statement: t.Statement;
    readonly source: t.Expression;
    readonly shape: t.ObjectExpression;
} {
    const tag = (element.openingElement.name as t.JSXIdentifier).name;
    const inSvg = svg || tag === 'svg';
    const cursor = `${walk.names.cursor}${depth}`;
    const statics: t.ObjectProperty[] = [];
    const body: t.Statement[] = [];
    const names = walk.names;
    const values = t.identifier(names.values);
    if (root) claimPort(walk, body, cursorCall(cursor, 'refPort', []));
    const attributes = element.openingElement.attributes as t.JSXAttribute[];
    const controlled =
        CONTROLLED_TAGS.test(tag) &&
        attributes.some(
            (attribute) =>
                /^(value|checked)$/.test((attribute.name as t.JSXIdentifier).name) &&
                readStaticValue(attribute.value) === undefined
        );
    const partProps: t.ObjectProperty[] = [];
    const sourceProps: t.ObjectProperty[] = [];
    const sourceChildren: (t.Expression | t.SpreadElement)[] = [];
    let partRef: t.Expression | null = null;
    let innerHtml = false;
    const shapeProps: t.Expression[] = [];
    const shapeValues: t.Expression[] = [];
    const shapeStatics: t.Expression[] = [];
    const shapeKids: t.Expression[] = [];
    let shapeRef = -1;
    for (const attribute of attributes) {
        const name = (attribute.name as t.JSXIdentifier).name;
        if (name === 'key') continue;
        const event =
            name.length > 2 && name[0] === 'o' && name[1] === 'n' && /[A-Z]/.test(name[2]);
        const literal = readStaticValue(attribute.value);
        if (literal !== undefined && !event && !PART_PROPS.test(name)) {
            if (literal === null) continue;
            shapeProps.push(t.stringLiteral(name));
            shapeValues.push(t.unaryExpression('-', t.numericLiteral(1)));
            shapeStatics.push(t.cloneNode(literal));
            sourceProps.push(t.objectProperty(propertyKey(name), t.cloneNode(literal)));
            statics.push(
                t.objectProperty(propertyKey(readExoReactAttributeName(name, inSvg)), literal)
            );
            continue;
        }
        const index = addValue(walk, readExpression(attribute.value));
        sourceProps.push(t.objectProperty(propertyKey(name), at(values, index)));
        if (name === 'ref') {
            shapeRef = index;
        } else {
            shapeProps.push(t.stringLiteral(name));
            shapeValues.push(t.numericLiteral(index));
            shapeStatics.push(t.identifier('undefined'));
        }
        if (name === 'dangerouslySetInnerHTML') innerHtml = true;
        if (event && !controlled && !name.endsWith('Capture')) {
            const handler = walk.events.length;
            walk.events.push(
                claimPort(
                    walk,
                    body,
                    cursorCall(cursor, 'eventPort', [
                        t.stringLiteral(readExoReactEventName(name, tag)),
                    ])
                )
            );
            walk.fills.push(
                t.expressionStatement(
                    t.assignmentExpression(
                        '=',
                        at(member(names.state, 'handlers'), handler),
                        at(values, index)
                    )
                )
            );
            continue;
        }
        if (event || PART_PROPS.test(name)) {
            if (name === 'ref') partRef = at(values, index);
            else partProps.push(t.objectProperty(propertyKey(name), at(values, index)));
            continue;
        }
        const port = claimPort(
            walk,
            body,
            cursorCall(cursor, 'port', [t.stringLiteral(readExoReactAttributeName(name, inSvg))])
        );
        const last = at(t.identifier(names.last), index);
        let written: t.Expression = t.assignmentExpression('=', last, at(values, index));
        if (/^(aria|data)-/.test(name)) {
            written = t.conditionalExpression(
                t.binaryExpression('==', written, t.nullLiteral()),
                t.nullLiteral(),
                t.callExpression(t.identifier('String'), [at(t.identifier(names.last), index)])
            );
        }
        walk.fills.push(
            t.ifStatement(
                t.binaryExpression('!==', at(t.identifier(names.last), index), at(values, index)),
                t.expressionStatement(
                    t.callExpression(member(names.connector, 'attr'), [t.identifier(port), written])
                )
            )
        );
    }
    if (partProps.length > 0 || partRef !== null) {
        const part = walk.parts.length;
        walk.parts.push(claimPort(walk, body, cursorCall(cursor, 'refPort', [])));
        walk.fills.push(
            t.expressionStatement(
                t.callExpression(t.identifier(walk.helpers.writeProps), [
                    at(member(names.state, 'parts'), part),
                    t.objectExpression(partProps),
                    partRef ?? t.nullLiteral(),
                ])
            )
        );
    }
    if (!innerHtml) {
        let run: t.Expression[] = [];
        const flush = (): void => {
            if (run.length === 0) return;
            const kids = run;
            run = [];
            if (kids.every((kid) => t.isStringLiteral(kid))) {
                const text = kids.map((kid) => (kid as t.StringLiteral).value).join('');
                body.push(
                    t.expressionStatement(cursorCall(cursor, 'text', [t.stringLiteral(text)]))
                );
                for (const kid of kids) sourceChildren.push(t.cloneNode(kid));
                shapeKids.push(
                    shapeKid('text', [
                        field('value', t.unaryExpression('-', t.numericLiteral(1))),
                        field('text', t.stringLiteral(text)),
                        field('width', t.numericLiteral(kids.length)),
                    ])
                );
                return;
            }
            const region = walk.regions.length;
            walk.regions.push(claimPort(walk, body, cursorCall(cursor, 'childrenPort', [])));
            const index = addValue(walk, kids.length === 1 ? kids[0] : t.arrayExpression(kids));
            sourceChildren.push(
                kids.length === 1 ? at(values, index) : t.spreadElement(at(values, index))
            );
            shapeKids.push(
                shapeKid('region', [
                    field('value', t.numericLiteral(index)),
                    field('width', t.numericLiteral(kids.length)),
                    field('whole', t.booleanLiteral(false)),
                ])
            );
            walk.fills.push(
                t.expressionStatement(
                    t.callExpression(t.identifier(walk.helpers.reconcileRegion), [
                        at(member(names.state, 'regions'), region),
                        at(values, index),
                    ])
                )
            );
        };
        for (const kid of t.react.buildChildren(element)) {
            if (t.isJSXElement(kid) && isCompilableHost(kid) && readLiteralKey(kid) !== undefined) {
                flush();
                const nested = emitHostElement(kid, cursor, depth + 1, inSvg, walk, false);
                body.push(nested.statement);
                sourceChildren.push(nested.source);
                shapeKids.push(shapeKid('host', [field('shape', nested.shape)]));
                continue;
            }
            run.push(kid as t.Expression);
        }
        flush();
    }
    const args: t.Expression[] = [t.stringLiteral(tag)];
    if (statics.length > 0) args.push(t.objectExpression(statics));
    else if (body.length > 0) args.push(t.nullLiteral());
    if (body.length > 0)
        args.push(t.arrowFunctionExpression([t.identifier(cursor)], t.blockStatement(body)));
    const onlyChild = sourceChildren.length === 1 ? sourceChildren[0] : null;
    if (onlyChild !== null && !t.isSpreadElement(onlyChild)) {
        sourceProps.push(t.objectProperty(t.identifier('children'), onlyChild));
    } else if (sourceChildren.length > 0) {
        sourceProps.push(
            t.objectProperty(t.identifier('children'), t.arrayExpression(sourceChildren))
        );
    }
    const key = root ? null : readLiteralKey(element);
    const sourceArgs: t.Expression[] = [t.stringLiteral(tag), t.objectExpression(sourceProps)];
    if (key !== null && key !== undefined) sourceArgs.push(t.stringLiteral(key));
    return {
        statement: t.expressionStatement(cursorCall(parent, 'el', args)),
        source: t.callExpression(t.identifier(walk.helpers.jsx), sourceArgs),
        shape: t.objectExpression([
            field('tag', t.stringLiteral(tag)),
            field(
                'key',
                key === null || key === undefined ? t.nullLiteral() : t.stringLiteral(key)
            ),
            field('props', t.arrayExpression(shapeProps)),
            field('values', t.arrayExpression(shapeValues)),
            field('statics', t.arrayExpression(shapeStatics)),
            field(
                'ref',
                shapeRef < 0
                    ? t.unaryExpression('-', t.numericLiteral(1))
                    : t.numericLiteral(shapeRef)
            ),
            field('part', t.booleanLiteral(partProps.length > 0 || partRef !== null)),
            field('html', t.booleanLiteral(innerHtml)),
            field('kids', t.arrayExpression(shapeKids)),
        ]),
    };
}
