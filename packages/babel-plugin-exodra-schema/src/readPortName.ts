import * as t from '@babel/types';

export function readPortName(value: t.Node, holder: string | null): string | null {
    if (holder === null || !t.isMemberExpression(value)) return null;
    if (!t.isIdentifier(value.object) || value.object.name !== holder) return null;
    if (!value.computed && t.isIdentifier(value.property)) return value.property.name;
    if (value.computed && t.isStringLiteral(value.property)) return value.property.value;
    return null;
}
