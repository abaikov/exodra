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

// A const from a statement not ended by `before` is refused: the swc port fills its table per statement.
export function readModuleConstantString(
    node: t.Node,
    scope: NodePath['scope'],
    before: number
): string | null {
    const expression = unwrapTypeScript(node);
    if (t.isStringLiteral(expression)) return expression.value;
    if (t.isTemplateLiteral(expression)) {
        let value: string | null | undefined = expression.quasis[0].value.cooked;
        for (let at = 0; at < expression.expressions.length && value != null; at++) {
            const part = readModuleConstantString(expression.expressions[at], scope, before);
            const tail = expression.quasis[at + 1].value.cooked;
            value = part === null || tail == null ? null : value + part + tail;
        }
        return value ?? null;
    }
    if (!t.isIdentifier(expression)) return null;
    const binding = scope.getBinding(expression.name);
    if (binding === undefined || binding.kind !== 'const' || !binding.scope.path.isProgram())
        return null;
    const declarator = binding.path.node;
    const statement = binding.path.parentPath?.node;
    if (!t.isVariableDeclarator(declarator) || !t.isIdentifier(declarator.id)) return null;
    if (declarator.init == null || statement?.end == null || statement.end > before) return null;
    return readModuleConstantString(declarator.init, binding.scope, statement.start ?? before);
}
