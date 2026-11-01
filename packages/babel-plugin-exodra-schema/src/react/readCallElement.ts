import type { NodePath } from '@babel/core';
import * as t from '@babel/types';
import { isCompilableHost } from './isCompilableHost';

const FACTORIES = new Set(['jsx', 'jsxs', 'jsxDEV', 'createElement']);
const HOST_TAG = /^[a-z][a-z0-9]*$/;
const ATTRIBUTE_NAME = /^[A-Za-z_$][A-Za-z0-9_$-]*$/;

function requiredSource(init: t.Node | null | undefined): string | null {
    if (!t.isCallExpression(init)) return null;
    if (t.isIdentifier(init.callee, { name: 'require' })) {
        const source = init.arguments[0];
        return t.isStringLiteral(source) ? source.value : null;
    }
    return init.arguments.length === 1 ? requiredSource(init.arguments[0]) : null;
}

function moduleOf(
    scope: NodePath['scope'],
    name: string
): { source: string; imported: string | null } | null {
    const binding = scope.getBinding(name);
    if (binding === undefined) return null;
    const node = binding.path.node;
    const parent = binding.path.parent;
    if (t.isImportSpecifier(node) && t.isImportDeclaration(parent)) {
        const imported = t.isIdentifier(node.imported) ? node.imported.name : node.imported.value;
        return { source: parent.source.value, imported };
    }
    if (
        (t.isImportNamespaceSpecifier(node) || t.isImportDefaultSpecifier(node)) &&
        t.isImportDeclaration(parent)
    ) {
        return { source: parent.source.value, imported: null };
    }
    if (t.isVariableDeclarator(node)) {
        const source = requiredSource(node.init);
        return source === null ? null : { source, imported: null };
    }
    return null;
}

function factoryOf(
    callee: t.Node,
    scope: NodePath['scope'],
    sources: ReadonlySet<string>
): string | null {
    if (
        t.isSequenceExpression(callee) &&
        callee.expressions.length === 2 &&
        t.isNumericLiteral(callee.expressions[0])
    ) {
        return factoryOf(callee.expressions[1], scope, sources);
    }
    if (t.isIdentifier(callee)) {
        const found = moduleOf(scope, callee.name);
        if (found === null || found.imported === null || !sources.has(found.source)) return null;
        return FACTORIES.has(found.imported) ? found.imported : null;
    }
    if (!t.isMemberExpression(callee) || callee.computed || !t.isIdentifier(callee.property)) {
        return null;
    }
    const name = callee.property.name;
    if (!FACTORIES.has(name)) return null;
    let object: t.Node = callee.object;
    if (
        t.isMemberExpression(object) &&
        !object.computed &&
        t.isIdentifier(object.property, { name: 'default' })
    ) {
        object = object.object;
    }
    if (!t.isIdentifier(object)) return null;
    const found = moduleOf(scope, object.name);
    return found !== null && found.imported === null && sources.has(found.source) ? name : null;
}

function spreadKids(
    spread: t.SpreadElement,
    statement: NodePath | null,
    scope: NodePath['scope'],
    used: NodePath[]
): readonly t.Node[] | null {
    if (!t.isIdentifier(spread.argument) || statement === null) return null;
    const binding = scope.getBinding(spread.argument.name);
    if (binding === undefined || binding.kind !== 'const' || binding.references !== 1) return null;
    const declarator = binding.path;
    if (!declarator.isVariableDeclarator() || !t.isArrayExpression(declarator.node.init)) {
        return null;
    }
    const declaration = declarator.parentPath;
    if (
        declaration === null ||
        !declaration.isVariableDeclaration() ||
        declaration.node.declarations.length !== 1 ||
        declaration.getSibling((declaration.key as number) + 1).node !== statement.node
    ) {
        return null;
    }
    const kids = declarator.node.init.elements;
    if (kids.some((kid) => kid === null || t.isSpreadElement(kid))) return null;
    used.push(declaration);
    return kids as t.Node[];
}

function childOf(
    child: t.Node,
    scope: NodePath['scope'],
    sources: ReadonlySet<string>
): t.JSXElement | t.JSXExpressionContainer | null {
    if (t.isSpreadElement(child) || t.isArgumentPlaceholder(child) || !t.isExpression(child)) {
        return null;
    }
    if (t.isJSXElement(child)) return child;
    if (t.isCallExpression(child)) {
        const nested = elementOf(child, scope, sources);
        if (nested !== null) return nested;
    }
    return t.jsxExpressionContainer(child);
}

function elementOf(
    call: t.CallExpression,
    scope: NodePath['scope'],
    sources: ReadonlySet<string>,
    statement: NodePath | null = null,
    used: NodePath[] = []
): t.JSXElement | null {
    const factory = factoryOf(call.callee, scope, sources);
    if (factory === null) return null;
    const args = call.arguments;
    const tag = args[0];
    if (!t.isStringLiteral(tag) || !HOST_TAG.test(tag.value)) return null;
    const attributes: t.JSXAttribute[] = [];
    const children: (t.JSXElement | t.JSXExpressionContainer)[] = [];
    const props = args[1];
    const classic = factory === 'createElement';
    if (
        props !== undefined &&
        !t.isNullLiteral(props) &&
        !t.isIdentifier(props, { name: 'undefined' })
    ) {
        if (!t.isObjectExpression(props)) return null;
        for (const property of props.properties) {
            if (!t.isObjectProperty(property) || property.computed) return null;
            const key = property.key;
            const name = t.isIdentifier(key) ? key.name : t.isStringLiteral(key) ? key.value : null;
            if (name === null || !ATTRIBUTE_NAME.test(name) || !t.isExpression(property.value)) {
                return null;
            }
            if (name === 'children' && !classic) {
                const kids = t.isArrayExpression(property.value)
                    ? property.value.elements
                    : [property.value];
                for (const kid of kids) {
                    if (kid === null) return null;
                    const converted = childOf(kid, scope, sources);
                    if (converted === null) return null;
                    children.push(converted);
                }
                continue;
            }
            const value = property.value;
            attributes.push(
                t.jsxAttribute(
                    t.jsxIdentifier(name),
                    t.isStringLiteral(value) ? value : t.jsxExpressionContainer(value)
                )
            );
        }
    }
    const key = classic ? undefined : args[2];
    if (key !== undefined) {
        if (!t.isExpression(key)) return null;
        if (!t.isIdentifier(key, { name: 'undefined' })) {
            attributes.push(
                t.jsxAttribute(
                    t.jsxIdentifier('key'),
                    t.isStringLiteral(key) ? key : t.jsxExpressionContainer(key)
                )
            );
        }
    }
    if (classic) {
        for (const arg of args.slice(2)) {
            const kids = t.isSpreadElement(arg) ? spreadKids(arg, statement, scope, used) : [arg];
            if (kids === null) return null;
            for (const kid of kids) {
                const converted = childOf(kid, scope, sources);
                if (converted === null) return null;
                children.push(converted);
            }
        }
    }
    const element = t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier(tag.value), attributes, children.length === 0),
        children.length === 0 ? null : t.jsxClosingElement(t.jsxIdentifier(tag.value)),
        children,
        children.length === 0
    );
    return isCompilableHost(element) ? element : null;
}

export function readCallElement(
    path: NodePath<t.CallExpression>,
    sources: ReadonlySet<string>
): t.JSXElement | null {
    const used: NodePath[] = [];
    const element = elementOf(path.node, path.scope, sources, path.getStatementParent(), used);
    if (element !== null) for (const declaration of used) declaration.remove();
    return element;
}
