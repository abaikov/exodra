import * as t from '@babel/types';

function attributeValue(value: t.JSXAttribute['value']): t.Expression {
    if (value === null || value === undefined) return t.booleanLiteral(true);
    if (t.isStringLiteral(value)) return t.stringLiteral(value.value);
    if (t.isJSXExpressionContainer(value)) {
        if (t.isJSXEmptyExpression(value.expression)) return t.booleanLiteral(true);
        return value.expression;
    }
    return value;
}

function tagExpression(name: t.JSXOpeningElement['name']): t.Expression {
    if (t.isJSXIdentifier(name)) {
        return /^[a-z]/.test(name.name) || name.name.includes('-')
            ? t.stringLiteral(name.name)
            : t.identifier(name.name);
    }
    if (t.isJSXMemberExpression(name)) {
        const object = name.object;
        return t.memberExpression(
            t.isJSXIdentifier(object) ? t.identifier(object.name) : tagExpression(object),
            t.identifier(name.property.name)
        );
    }
    return t.stringLiteral(`${name.namespace.name}:${name.name.name}`);
}

function propertyKey(name: string): t.Identifier | t.StringLiteral {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? t.identifier(name) : t.stringLiteral(name);
}

export function emitRuntimeElement(
    node: t.JSXElement | t.JSXFragment,
    jsx: string,
    fragment: () => string
): t.CallExpression {
    const properties: (t.ObjectProperty | t.SpreadElement)[] = [];
    let key: t.Expression | null = null;
    let type: t.Expression;
    if (t.isJSXFragment(node)) {
        type = t.identifier(fragment());
    } else {
        type = tagExpression(node.openingElement.name);
        for (const attribute of node.openingElement.attributes) {
            if (t.isJSXSpreadAttribute(attribute)) {
                properties.push(t.spreadElement(attribute.argument));
                continue;
            }
            const name = t.isJSXIdentifier(attribute.name)
                ? attribute.name.name
                : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
            const value = attributeValue(attribute.value);
            if (name === 'key') key = value;
            else properties.push(t.objectProperty(propertyKey(name), value));
        }
    }
    const children = t.react.buildChildren(node as t.JSXElement) as t.Expression[];
    if (children.length === 1) {
        properties.push(t.objectProperty(t.identifier('children'), children[0]));
    } else if (children.length > 1) {
        properties.push(t.objectProperty(t.identifier('children'), t.arrayExpression(children)));
    }
    const args: t.Expression[] = [type, t.objectExpression(properties)];
    if (key !== null) args.push(key);
    return t.callExpression(t.identifier(jsx), args);
}
