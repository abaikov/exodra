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
export function shouldHoistSchema(path: NodePath<t.CallExpression>, names: HelperNames): boolean {
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
        // A spread (from `props={obj}`) injects a runtime object that may carry
        // bindables/handlers — never hoist/clone-cache such an element.
        if (t.isSpreadElement(prop)) return false;
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
        return isStaticValue(staticProp.value, names);
    }
    return true;
}

// Resolved local names of the runtime helpers. Usually the bare `h`/`text`, but
// a uid (`_h`/`_text`) when the source file shadows those names.
interface HelperNames {
    h: string;
    text: string;
}

function isStaticValue(node: t.Node, names: HelperNames): boolean {
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
            prop => t.isObjectProperty(prop) && isStaticValue(prop.value, names)
        );
    }
    if (t.isArrayExpression(node)) {
        return node.elements.every(el => el != null && isStaticValue(el, names));
    }
    // Nested h()/text() calls are static if all their args are static.
    if (t.isCallExpression(node)) {
        const callee = node.callee;
        if (
            t.isIdentifier(callee) &&
            (callee.name === names.h || callee.name === names.text)
        ) {
            return node.arguments.every(arg => isStaticValue(arg, names));
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

// A templatable subtree: the number of DOM nodes it materialises and whether it
// carries any "holes" (nodes with bindable/handler buckets, patched per instance).
interface TemplateInfo {
    hasHoles: boolean;
    nodeCount: number;
}

// A plain lowercase element tag literal — not a component (identifier / capitalised)
// and not a special `#fragment` / `#text` type.
function isLowercaseTagLiteral(node: t.Node | null | undefined): boolean {
    if (!node || !t.isStringLiteral(node)) return false;
    const first = node.value[0];
    if (first === undefined || first === '#') return false;
    return !(first >= 'A' && first <= 'Z');
}

function objectHasKey(obj: t.ObjectExpression, name: string): boolean {
    return obj.properties.some(
        p =>
            t.isObjectProperty(p) &&
            t.isIdentifier(p.key) &&
            p.key.name === name
    );
}

// Analyse whether an `h(...)` call is a templatable subtree — a clonable skeleton
// whose STRUCTURE is invariant across occurrences, with optional per-instance holes
// (bindable attributes/text, handlers). Returns null (NOT templatable) the moment
// anything could make the structure vary between occurrences, so the runtime may
// clone+patch it safely:
//   • component / dynamic / `#fragment` tag                → null
//   • spread props, computed/unknown bucket keys           → null
//   • bindableLists, bindables.children, bindableHandlers  → null (insert-points /
//                                                             unsupported holes)
//   • a non-`children` static value that is not a literal  → null (can't bake it)
//   • `children` that is not a fixed array/child of        → null (structure varies)
//     templatable children (e.g. a `.map()` expression)
// bindables (non-children) and handlers ARE allowed — they mark holes.
function analyzeTemplate(
    node: t.CallExpression,
    names: HelperNames
): TemplateInfo | null {
    const callee = node.callee;
    if (!t.isIdentifier(callee) || callee.name !== names.h) return null;
    const args = node.arguments;
    if (!isLowercaseTagLiteral(args[0] as t.Node)) return null;

    let hasHoles = false;
    let nodeCount = 1;

    if (args.length >= 2) {
        const props = args[1];
        if (!t.isObjectExpression(props)) return null;
        for (const prop of props.properties) {
            if (t.isSpreadElement(prop)) return null;
            if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) return null;
            const key = prop.key.name;
            if (key === 'bindableLists' || key === 'bindableHandlers') {
                return null; // insert-point / reactive-handler hole — unsupported
            }
            if (key === 'bindables') {
                if (!t.isObjectExpression(prop.value)) return null;
                if (objectHasKey(prop.value, 'children')) return null; // insert-point
                hasHoles = true;
            } else if (key === 'handlers') {
                if (!t.isObjectExpression(prop.value)) return null;
                hasHoles = true;
            } else if (key === 'static') {
                if (!t.isObjectExpression(prop.value)) return null;
                for (const sp of prop.value.properties) {
                    if (
                        t.isSpreadElement(sp) ||
                        !t.isObjectProperty(sp) ||
                        !t.isIdentifier(sp.key)
                    ) {
                        return null;
                    }
                    if (sp.key.name === 'children') {
                        const info = analyzeChildren(sp.value, names);
                        if (!info) return null;
                        hasHoles = hasHoles || info.hasHoles;
                        nodeCount += info.nodeCount;
                    } else if (!isStaticValue(sp.value, names)) {
                        return null; // dynamic value in the static bucket
                    }
                }
            } else {
                return null; // unknown bucket → be conservative
            }
        }
    }
    return { hasHoles, nodeCount };
}

// Analyse a `static.children` value: a fixed array / single child / static text of
// templatable children. Any dynamic shape (a `.map()`, an identifier) → null.
function analyzeChildren(
    node: t.Node,
    names: HelperNames
): TemplateInfo | null {
    if (t.isArrayExpression(node)) {
        let nodeCount = 0;
        let hasHoles = false;
        for (const el of node.elements) {
            if (el == null) return null;
            const info = analyzeChild(el, names);
            if (!info) return null;
            nodeCount += info.nodeCount;
            hasHoles = hasHoles || info.hasHoles;
        }
        return { hasHoles, nodeCount };
    }
    return analyzeChild(node, names);
}

function analyzeChild(
    node: t.Node,
    names: HelperNames
): TemplateInfo | null {
    if (t.isCallExpression(node)) {
        const callee = node.callee;
        if (t.isIdentifier(callee) && callee.name === names.h) {
            return analyzeTemplate(node, names);
        }
        if (t.isIdentifier(callee) && callee.name === names.text) {
            return node.arguments.every(a => isStaticValue(a, names))
                ? { hasHoles: false, nodeCount: 1 }
                : null;
        }
        return null; // arbitrary call (.map(), a helper) → dynamic structure
    }
    if (
        t.isStringLiteral(node) ||
        t.isNumericLiteral(node) ||
        t.isBooleanLiteral(node)
    ) {
        return { hasHoles: false, nodeCount: 1 };
    }
    return null; // identifier / expression → dynamic
}

export function optimizeStaticSchemas(programPath: NodePath<t.Program>, names: HelperNames): void {
    const keyDecls: t.Statement[] = [];

    programPath.traverse({
        CallExpression(path) {
            const callee = path.node.callee;
            if (!t.isIdentifier(callee) || callee.name !== names.h) return;
            // Already has a 3rd arg (a manual cache:key) — leave it.
            if (path.node.arguments.length >= 3) return;
            if (!isInsideIteration(path)) return;
            const info = analyzeTemplate(path.node, names);
            if (!info) return;
            // A single-node HOLE template is not worth it — cloning + patching one
            // node doesn't beat building it. Fully-static single nodes stay eligible
            // (a clone with baked attrs is at least as cheap as createElement).
            if (info.hasHoles && info.nodeCount < 2) return;

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
