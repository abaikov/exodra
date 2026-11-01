import * as t from '@babel/types';
import { emitHostElement } from './emitHostElement';
import type { TExoHostTreeWalk } from './types/TExoHostTreeWalk';
import type { TExoReactNames } from './types/TExoReactNames';

export function compileHostTree(
    element: t.JSXElement,
    names: TExoReactNames,
    serial: number,
    imports: {
        readonly schemaFactory: string;
        readonly hostFactory: string;
        readonly reconcileRegion: string;
        readonly writeProps: string;
        readonly jsx: string;
        readonly hostElement: string;
    }
): { readonly hoisted: t.Statement[]; readonly replacement: t.CallExpression } {
    const walk: TExoHostTreeWalk = {
        names,
        helpers: {
            reconcileRegion: imports.reconcileRegion,
            writeProps: imports.writeProps,
            jsx: imports.jsx,
        },
        slots: [],
        ports: [],
        values: [],
        fills: [],
        regions: [],
        events: [],
        parts: [],
        nextPort: 0,
    };
    const rootCursor = `${names.cursor}0`;
    const {
        statement: tree,
        source,
        shape,
    } = emitHostElement(element, rootCursor, 1, false, walk, true);
    const schema = `${names.schema}${serial}`;
    const machine = `${names.machine}${serial}`;
    const ports = walk.ports.map((port) => `${port}_${serial}`);
    const renamed = new Map(walk.ports.map((port, i) => [port, ports[i]]));
    const rename = (port: string): t.Identifier => t.identifier(renamed.get(port) as string);

    const cursorBody: t.Statement[] = [
        t.variableDeclaration(
            'let',
            walk.slots.map((slot) => t.variableDeclarator(t.identifier(slot)))
        ),
        tree,
        t.returnStatement(t.arrayExpression(walk.slots.map((slot) => t.identifier(slot)))),
    ];
    t.traverseFast(t.blockStatement(walk.fills), (node) => {
        if (t.isIdentifier(node) && renamed.has(node.name))
            node.name = renamed.get(node.name) as string;
    });
    const hoisted: t.Statement[] = [
        t.variableDeclaration('const', [
            t.variableDeclarator(
                t.identifier(schema),
                t.callExpression(t.identifier(imports.schemaFactory), [
                    t.arrowFunctionExpression(
                        [t.identifier(rootCursor)],
                        t.blockStatement(cursorBody)
                    ),
                ])
            ),
        ]),
        t.variableDeclaration('const', [
            t.variableDeclarator(
                t.arrayPattern(ports.map((port) => t.identifier(port))),
                t.memberExpression(t.identifier(schema), t.identifier('ports'))
            ),
        ]),
        t.variableDeclaration('const', [
            t.variableDeclarator(
                t.identifier(machine),
                t.callExpression(t.identifier(imports.hostFactory), [
                    t.identifier(schema),
                    t.identifier(ports[0]),
                    t.arrayExpression(walk.regions.map(rename)),
                    t.arrayExpression(walk.events.map(rename)),
                    t.arrayExpression(walk.parts.map(rename)),
                    t.arrowFunctionExpression(
                        [
                            t.identifier(names.connector),
                            t.identifier(names.element),
                            t.identifier(names.state),
                        ],
                        t.blockStatement([
                            t.variableDeclaration('const', [
                                t.variableDeclarator(
                                    t.identifier(names.values),
                                    t.memberExpression(
                                        t.identifier(names.element),
                                        t.identifier('values')
                                    )
                                ),
                                t.variableDeclarator(
                                    t.identifier(names.last),
                                    t.memberExpression(
                                        t.identifier(names.state),
                                        t.identifier('last')
                                    )
                                ),
                            ]),
                            ...walk.fills,
                        ])
                    ),
                    t.stringLiteral((element.openingElement.name as t.JSXIdentifier).name),
                    t.arrowFunctionExpression([t.identifier(names.values)], source),
                    shape,
                ])
            ),
        ]),
    ];
    const keyAttribute = element.openingElement.attributes.find(
        (attribute): attribute is t.JSXAttribute =>
            t.isJSXAttribute(attribute) && t.isJSXIdentifier(attribute.name, { name: 'key' })
    );
    const args: t.Expression[] = [t.identifier(machine), t.arrayExpression(walk.values)];
    if (
        keyAttribute !== undefined &&
        keyAttribute.value !== null &&
        keyAttribute.value !== undefined
    ) {
        const value = keyAttribute.value;
        if (t.isStringLiteral(value)) args.push(t.stringLiteral(value.value));
        else if (t.isJSXExpressionContainer(value) && !t.isJSXEmptyExpression(value.expression)) {
            args.push(value.expression);
        }
    }
    return {
        hoisted,
        replacement: t.callExpression(t.identifier(imports.hostElement), args),
    };
}
