import { traverse } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as t from '@babel/types';
import type { TExoRewriteContext } from './types/TExoRewriteContext';

function call(name: string, args: t.Expression[]): t.CallExpression {
    return t.callExpression(t.identifier(name), args);
}

function rewriteConnectorCall(
    method: string,
    args: t.Expression[],
    context: TExoRewriteContext
): t.Expression | null {
    const port = args.length > 0 ? context.portOf(args[0]) : null;
    if ((method === 'text' || method === 'attr' || method === 'unsafeHtml') && port !== null) {
        return call(context.setterOf(port), [args[1] ?? t.identifier('undefined')]);
    }
    if (method === 'on' && port !== null) {
        const handler = args[1];
        const subject = args[2];
        const bound =
            subject === undefined
                ? handler
                : t.arrowFunctionExpression(
                      [t.identifier('event')],
                      t.callExpression(handler, [t.identifier('event'), subject])
                  );
        return call(context.handlerSetterOf(port), [t.arrowFunctionExpression([], bound)]);
    }
    if (method === 'childList' && port !== null) {
        context.runtime.add('createExoChildren');
        return call('createExoChildren', [t.identifier(context.setterOf(port))]);
    }
    if (method === 'build') {
        context.runtime.add('buildExoChild');
        return call('buildExoChild', args);
    }
    if (method === 'one' && port !== null) {
        context.runtime.add('buildExoChild');
        return call(context.setterOf(port), [
            t.arrayExpression([
                t.memberExpression(
                    call('buildExoChild', [
                        args[1],
                        t.numericLiteral(0),
                        ...(args[2] ? [args[2]] : []),
                    ]),
                    t.identifier('element')
                ),
            ]),
        ]);
    }
    if (method === 'list' && port !== null) {
        context.runtime.add('buildExoChild');
        return call(context.setterOf(port), [
            t.callExpression(t.memberExpression(t.identifier('Array'), t.identifier('from')), [
                t.objectExpression([t.objectProperty(t.identifier('length'), args[2])]),
                t.arrowFunctionExpression(
                    [t.identifier('_'), t.identifier('i')],
                    t.memberExpression(
                        call('buildExoChild', [args[1], t.identifier('i')]),
                        t.identifier('element')
                    )
                ),
            ]),
        ]);
    }
    if (method === 'readState')
        return t.memberExpression(t.identifier(context.stateRef), t.identifier('current'));
    if (method === 'onTeardown') {
        return t.callExpression(
            t.memberExpression(
                t.memberExpression(t.identifier(context.teardownsRef), t.identifier('current')),
                t.identifier('push')
            ),
            [args[0]]
        );
    }
    return null;
}

export function rewriteExoConnectorCalls(
    fn: t.ArrowFunctionExpression | t.FunctionExpression,
    context: TExoRewriteContext,
    where: string
): t.ArrowFunctionExpression {
    const first = fn.params[0];
    const connector = first !== undefined && t.isIdentifier(first) ? first.name : null;
    const copy = t.cloneNode(fn, true);
    const body = t.isBlockStatement(copy.body)
        ? copy.body
        : t.blockStatement([t.returnStatement(copy.body)]);
    const file = t.file(t.program([t.expressionStatement(t.arrowFunctionExpression([], body))]));
    traverse(
        file,
        {
            CallExpression(path: NodePath<t.CallExpression>) {
                const callee = path.node.callee;
                const args = path.node.arguments as t.Expression[];
                if (
                    connector !== null &&
                    t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object, { name: connector }) &&
                    t.isIdentifier(callee.property)
                ) {
                    const replacement = rewriteConnectorCall(callee.property.name, args, context);
                    if (replacement === null) {
                        context.unsupported.push(
                            `${where}: c.${callee.property.name}(…) has no React form`
                        );
                        return;
                    }
                    path.replaceWith(replacement);
                    return;
                }
                if (t.isIdentifier(callee) && context.transitions.has(callee.name)) {
                    if (
                        connector !== null &&
                        args.length > 0 &&
                        t.isIdentifier(args[0], { name: connector })
                    ) {
                        path.node.arguments = args.slice(1);
                    }
                    return;
                }
                if (t.isIdentifier(callee) && callee.name === 'wireExoNode') {
                    context.runtime.add('wireExoChild');
                    path.node.callee = t.identifier('wireExoChild');
                }
                if (t.isIdentifier(callee) && callee.name === 'reconcileExoOrder') {
                    context.runtime.add('reconcileExoOrder');
                }
            },
            MemberExpression(path: NodePath<t.MemberExpression>) {
                if (
                    connector !== null &&
                    t.isIdentifier(path.node.object, { name: connector }) &&
                    t.isIdentifier(path.node.property, { name: 'state' })
                ) {
                    path.replaceWith(
                        t.memberExpression(t.identifier(context.stateRef), t.identifier('current'))
                    );
                }
            },
            Identifier(path: NodePath<t.Identifier>) {
                if (connector === null || path.node.name !== connector) return;
                if (path.parentPath.isMemberExpression({ object: path.node })) return;
                context.unsupported.push(
                    `${where}: the exonode \`${connector}\` escapes as a value`
                );
            },
        },
        undefined,
        undefined,
        undefined
    );
    return t.arrowFunctionExpression(copy.params.slice(1) as t.Identifier[], body, copy.async);
}
