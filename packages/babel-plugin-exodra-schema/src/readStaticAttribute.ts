import * as t from '@babel/types';

// A LITERAL is markup, folded into the schema; `null` means the value is an expression and the
// attribute is a port. Rebuilt, never reused: a parsed literal carries its raw text and the
// generator prints that back, so a reused node would put the author's quoting into the schema.
export function readStaticAttribute(
    value: t.JSXAttribute['value'],
    readModuleConstantString: (expression: t.Node) => string | null
): t.Expression | null {
    if (value === null || value === undefined) return t.booleanLiteral(true);
    if (t.isStringLiteral(value)) return t.stringLiteral(value.value);
    if (t.isJSXExpressionContainer(value)) {
        const expr = value.expression;
        if (t.isStringLiteral(expr)) return t.stringLiteral(expr.value);
        if (t.isNumericLiteral(expr)) return t.numericLiteral(expr.value);
        if (t.isBooleanLiteral(expr)) return t.booleanLiteral(expr.value);
        if (t.isJSXEmptyExpression(expr)) return null;
        const folded = readModuleConstantString(expr);
        if (folded !== null) return t.stringLiteral(folded);
    }
    return null;
}
