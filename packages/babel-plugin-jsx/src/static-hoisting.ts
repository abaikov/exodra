/**
 * Auto clone-cache for static schemas.
 *
 * A fully-static subtree built many times (inside a .map()/loop) is given a
 * generated `cacheKey` symbol — the runtime builds it once and clones the rest.
 * The h() call stays inline (fresh object per iteration), so there is no shared
 * schema object (which would collide in the per-position bookkeeping); only the
 * symbol key is shared. One-off statics get no key (nothing to reuse).
 */

import * as t from '@babel/types';
import type { NodePath } from '@babel/core';

// A fully-static h(type, attrs) call: no reactive buckets, children recursively static.
export function shouldHoistSchema(path: NodePath<t.CallExpression>): boolean {
    const args = path.node.arguments;
    if (args.length < 2) return false;
    
    // NEVER hoist components - they might have internal state/bindables
    const typeArg = args[0];
    if (t.isIdentifier(typeArg)) {
        // Component reference - never hoist
        return false;
    }
    if (t.isStringLiteral(typeArg)) {
        // Check if it's a capitalized component name
        const tagName = typeArg.value;
        if (tagName[0] >= 'A' && tagName[0] <= 'Z') {
            return false;
        }
    }

    const propsArg = args[1];
    if (!t.isObjectExpression(propsArg)) return false;

    for (const prop of propsArg.properties) {
        if (!t.isObjectProperty(prop)) continue;
        if (!t.isIdentifier(prop.key)) continue;
        const key = prop.key.name;
        if (
            key === 'bindables' ||
            key === 'bindableLists' ||
            key === 'bindableHandlers' ||
            key === 'handlers'
        ) {
            return false;
        }
    }

    const staticProp = propsArg.properties.find(
        p =>
            t.isObjectProperty(p) &&
            t.isIdentifier(p.key) &&
            p.key.name === 'static'
    );
    if (staticProp && t.isObjectProperty(staticProp)) {
        return isStaticValue(staticProp.value);
    }
    return true;
}

function isStaticValue(node: t.Node): boolean {
    if (
        t.isStringLiteral(node) ||
        t.isNumericLiteral(node) ||
        t.isBooleanLiteral(node) ||
        t.isNullLiteral(node)
    ) {
        return true;
    }
    if (t.isObjectExpression(node)) {
        return node.properties.every(
            prop => t.isObjectProperty(prop) && isStaticValue(prop.value)
        );
    }
    if (t.isArrayExpression(node)) {
        return node.elements.every(el => el != null && isStaticValue(el));
    }
    // Nested h()/text() calls are static if all their args are static.
    if (t.isCallExpression(node)) {
        const callee = node.callee;
        if (
            t.isIdentifier(callee) &&
            (callee.name === 'h' || callee.name === 'text')
        ) {
            return node.arguments.every(arg => isStaticValue(arg));
        }
    }
    return false;
}

const ITERATION_METHODS = new Set(['map', 'forEach', 'flatMap']);

// True if `path` runs inside a loop or an array-iteration callback — i.e. the same
// node is built many times, so cloning a cached template is worth it.
function isInsideIteration(path: NodePath): boolean {
    let current: NodePath | null = path.parentPath;
    while (current) {
        const node = current.node;
        if (
            t.isForStatement(node) ||
            t.isForInStatement(node) ||
            t.isForOfStatement(node) ||
            t.isWhileStatement(node) ||
            t.isDoWhileStatement(node)
        ) {
            return true;
        }
        if (
            (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) &&
            current.parentPath?.isCallExpression()
        ) {
            const callee = (current.parentPath.node as t.CallExpression).callee;
            if (
                t.isMemberExpression(callee) &&
                t.isIdentifier(callee.property) &&
                ITERATION_METHODS.has(callee.property.name)
            ) {
                return true;
            }
        }
        current = current.parentPath;
    }
    return false;
}

export function optimizeStaticSchemas(programPath: NodePath<t.Program>): void {
    const keyDecls: t.Statement[] = [];

    programPath.traverse({
        CallExpression(path) {
            const callee = path.node.callee;
            if (!t.isIdentifier(callee) || callee.name !== 'h') return;
            // Already has a 3rd arg (a manual cache:key) — leave it.
            if (path.node.arguments.length >= 3) return;
            if (!shouldHoistSchema(path)) return;
            if (!isInsideIteration(path)) return;

            // const _ckN = Symbol(); ... h(type, attrs, _ckN)
            const keyId = programPath.scope.generateUidIdentifier('ck');
            keyDecls.push(
                t.variableDeclaration('const', [
                    t.variableDeclarator(
                        keyId,
                        t.callExpression(t.identifier('Symbol'), [])
                    ),
                ])
            );
            const args = path.node.arguments;
            if (args.length < 2) args.push(t.objectExpression([]));
            args.push(keyId);
        },
    });

    if (keyDecls.length > 0) {
        programPath.node.body.unshift(...keyDecls);
    }
}
