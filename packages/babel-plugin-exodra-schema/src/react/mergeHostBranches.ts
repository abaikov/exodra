import * as t from '@babel/types';
import { isCompilableHost } from './isCompilableHost';

const COMPARISONS = new Set(['===', '!==', '==', '!=', '<', '>', '<=', '>=']);

function isRepeatableTest(test: t.Node): boolean {
    if (t.isIdentifier(test) || t.isLiteral(test)) return !t.isTemplateLiteral(test);
    if (t.isMemberExpression(test)) {
        return !test.computed && isRepeatableTest(test.object);
    }
    if (t.isUnaryExpression(test, { operator: '!' })) return isRepeatableTest(test.argument);
    if (t.isBinaryExpression(test) && COMPARISONS.has(test.operator)) {
        return isRepeatableTest(test.left) && isRepeatableTest(test.right);
    }
    return false;
}

function tagOf(element: t.JSXElement): string {
    return (element.openingElement.name as t.JSXIdentifier).name;
}

function attributeOf(element: t.JSXElement, name: string): t.JSXAttribute | undefined {
    return (element.openingElement.attributes as t.JSXAttribute[]).find(
        (attribute) => (attribute.name as t.JSXIdentifier).name === name
    );
}

function literalOf(attribute: t.JSXAttribute | undefined): string | null | undefined {
    if (attribute === undefined) return null;
    const value = attribute.value;
    if (value === null || value === undefined) return undefined;
    if (t.isStringLiteral(value)) return value.value;
    if (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression)) {
        return value.expression.value;
    }
    return undefined;
}

function expressionOf(attribute: t.JSXAttribute | undefined): t.Expression {
    if (attribute === undefined) return t.identifier('undefined');
    const value = attribute.value;
    if (value === null || value === undefined) return t.booleanLiteral(true);
    if (t.isJSXExpressionContainer(value)) {
        return t.isJSXEmptyExpression(value.expression)
            ? t.identifier('undefined')
            : value.expression;
    }
    return value as t.Expression;
}

function isSameHost(a: t.Node | undefined, b: t.Node | undefined): a is t.JSXElement {
    if (!t.isJSXElement(a) || !t.isJSXElement(b)) return false;
    if (!isCompilableHost(a) || !isCompilableHost(b) || tagOf(a) !== tagOf(b)) return false;
    const key = literalOf(attributeOf(a, 'key'));
    return key !== undefined && key === literalOf(attributeOf(b, 'key'));
}

function choose(test: t.Expression, a: t.Expression, b: t.Expression): t.Expression {
    return t.conditionalExpression(t.cloneNode(test), a, b);
}

function merge(test: t.Expression, a: t.JSXElement, b: t.JSXElement): t.JSXElement {
    const names: string[] = [];
    for (const element of [a, b]) {
        for (const attribute of element.openingElement.attributes as t.JSXAttribute[]) {
            const name = (attribute.name as t.JSXIdentifier).name;
            if (!names.includes(name)) names.push(name);
        }
    }
    const attributes: t.JSXAttribute[] = [];
    for (const name of names) {
        const left = attributeOf(a, name);
        const right = attributeOf(b, name);
        const same = literalOf(left);
        if (
            left !== undefined &&
            right !== undefined &&
            same !== undefined &&
            same === literalOf(right)
        ) {
            attributes.push(left);
            continue;
        }
        attributes.push(
            t.jsxAttribute(
                t.jsxIdentifier(name),
                t.jsxExpressionContainer(choose(test, expressionOf(left), expressionOf(right)))
            )
        );
    }
    const left = t.react.buildChildren(a);
    const right = t.react.buildChildren(b);
    const children: (t.JSXElement | t.JSXExpressionContainer)[] = [];
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const x = left[i];
        const y = right[i];
        if (isSameHost(x, y)) {
            children.push(merge(test, x, y as t.JSXElement));
        } else if (t.isStringLiteral(x) && t.isStringLiteral(y) && x.value === y.value) {
            children.push(t.jsxExpressionContainer(x));
        } else {
            children.push(
                t.jsxExpressionContainer(
                    choose(
                        test,
                        x === undefined ? t.nullLiteral() : (x as t.Expression),
                        y === undefined ? t.nullLiteral() : (y as t.Expression)
                    )
                )
            );
        }
    }
    const name = t.jsxIdentifier(tagOf(a));
    return t.jsxElement(
        t.jsxOpeningElement(name, attributes, children.length === 0),
        children.length === 0 ? null : t.jsxClosingElement(t.jsxIdentifier(tagOf(a))),
        children,
        children.length === 0
    );
}

export function mergeHostBranches(node: t.ConditionalExpression): t.JSXElement | null {
    if (!isRepeatableTest(node.test) || !isSameHost(node.consequent, node.alternate)) return null;
    return merge(node.test, node.consequent, node.alternate as t.JSXElement);
}
