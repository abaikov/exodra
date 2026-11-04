import type { NodePath } from '@babel/core';
import * as t from '@babel/types';

function unwrapTypeScript(node: t.Node): t.Node {
    let current = node;
    while (
        t.isTSAsExpression(current) ||
        t.isTSSatisfiesExpression(current) ||
        t.isTSTypeAssertion(current) ||
        t.isTSNonNullExpression(current) ||
        t.isParenthesizedExpression(current)
    ) {
        current = current.expression;
    }
    return current;
}

function rootOf(node: t.Node): t.Identifier | null {
    let current = node;
    while (t.isMemberExpression(current)) {
        if (
            current.computed
                ? !t.isStringLiteral(current.property)
                : !t.isIdentifier(current.property)
        )
            return null;
        current = current.object;
    }
    return t.isIdentifier(current) ? current : null;
}

// The schema is hoisted to module scope, so only a root that module scope sees means the same there.
export function readModuleValue(
    node: t.Node,
    scope: NodePath['scope'],
    before: number
): t.Expression | null {
    const expression = unwrapTypeScript(node);
    const root = rootOf(expression);
    if (root === null || !t.isExpression(expression)) return null;
    const binding = scope.getBinding(root.name);
    if (binding === undefined) return null;
    if (binding.kind === 'module') {
        const specifier = binding.path.node;
        const declaration = binding.path.parentPath?.node;
        const typeOnly =
            (t.isImportSpecifier(specifier) && specifier.importKind === 'type') ||
            (t.isImportDeclaration(declaration) && declaration.importKind === 'type');
        return typeOnly ? null : t.cloneNode(expression);
    }
    if (binding.kind !== 'const' || !binding.scope.path.isProgram()) return null;
    const statement = binding.path.parentPath?.node;
    if (!t.isVariableDeclarator(binding.path.node) || !t.isIdentifier(binding.path.node.id))
        return null;
    if (statement?.end == null || statement.end > before) return null;
    return t.cloneNode(expression);
}
