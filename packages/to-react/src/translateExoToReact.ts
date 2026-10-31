import { parseSync, traverse, transformFromAstSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as t from '@babel/types';
import { emitReactMarkup } from './emitReactMarkup';
import { rewriteExoConnectorCalls } from './rewriteExoConnectorCalls';
import type { TExoMachineSource } from './types/TExoMachineSource';
import type { TExoPortSource } from './types/TExoPortSource';
import type { TExoRewriteContext } from './types/TExoRewriteContext';
import type { TExoTranslation } from './types/TExoTranslation';
import { EXO_REACT_CHILDREN_RUNTIME } from './EXO_REACT_CHILDREN_RUNTIME';

type TExoFunction = t.ArrowFunctionExpression | t.FunctionExpression;

type TExoSchemaSource = {
    readonly holder: string | null;
    readonly root: t.JSXElement;
    readonly ports: Map<string, TExoPortSource>;
};

const MACHINE_STEPS = new Set(['createInitialState', 'wire', 'effect', 'on']);

const EXODRA_SOURCES = /^@exodra\/(core|jsx|dom|list-reconcile)$/;

function isFunction(node: t.Node | undefined): node is TExoFunction {
    return (
        node !== undefined && (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node))
    );
}

function readHolder(fn: TExoFunction): string | null {
    const first = fn.params[0];
    return first !== undefined && t.isIdentifier(first) ? first.name : null;
}

function readRoot(fn: TExoFunction): t.JSXElement | null {
    if (t.isJSXElement(fn.body)) return fn.body;
    if (t.isBlockStatement(fn.body)) {
        const last = fn.body.body[fn.body.body.length - 1];
        if (last !== undefined && t.isReturnStatement(last) && t.isJSXElement(last.argument)) {
            return last.argument;
        }
    }
    return null;
}

function portName(node: t.Node, holder: string | null): string | null {
    if (
        holder === null ||
        !t.isMemberExpression(node) ||
        !t.isIdentifier(node.object, { name: holder })
    ) {
        return null;
    }
    if (!node.computed && t.isIdentifier(node.property)) return node.property.name;
    if (node.computed && t.isStringLiteral(node.property)) return node.property.value;
    return null;
}

function collectPorts(
    element: t.JSXElement,
    holder: string | null,
    ports: Map<string, TExoPortSource>
): void {
    for (const attribute of element.openingElement.attributes) {
        if (!t.isJSXAttribute(attribute) || !t.isJSXExpressionContainer(attribute.value)) continue;
        const name = portName(attribute.value.expression, holder);
        if (name === null) continue;
        const raw = t.isJSXIdentifier(attribute.name)
            ? attribute.name.name
            : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
        if (raw.startsWith('on:') || /^on[A-Z]/.test(raw)) {
            const event = raw.startsWith('on:') ? raw.slice(3) : raw.slice(2).toLowerCase();
            ports.set(name, { name, kind: 'event', attribute: null, event });
        } else if (raw === 'ref') {
            ports.set(name, { name, kind: 'ref', attribute: null, event: null });
        } else if (raw === 'unsafeHtml') {
            ports.set(name, { name, kind: 'html', attribute: null, event: null });
        } else {
            ports.set(name, { name, kind: 'attr', attribute: raw, event: null });
        }
    }
    for (const child of element.children) {
        if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
            const name = portName(child.expression, holder);
            if (name !== null)
                ports.set(name, { name, kind: 'text', attribute: null, event: null });
        } else if (t.isJSXElement(child)) {
            const tag = child.openingElement.name;
            if (
                holder !== null &&
                t.isJSXMemberExpression(tag) &&
                t.isJSXIdentifier(tag.object, { name: holder })
            ) {
                const name = tag.property.name;
                ports.set(name, { name, kind: 'children', attribute: null, event: null });
            } else {
                collectPorts(child, holder, ports);
            }
        }
    }
}

function identifierOf(port: string): string {
    const words = port.split(/[^A-Za-z0-9]+/).filter((word) => word !== '');
    const joined = words
        .map((word, i) =>
            i === 0 ? word[0].toLowerCase() + word.slice(1) : word[0].toUpperCase() + word.slice(1)
        )
        .join('');
    return /^[0-9]/.test(joined) ? `port${joined}` : joined;
}

function capitalised(name: string): string {
    return name[0].toUpperCase() + name.slice(1);
}

function componentNameOf(constant: string): string {
    return constant
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word !== '')
        .map(capitalised)
        .join('');
}

function useCall(hook: string, args: t.Expression[], typeArgument?: t.TSType): t.CallExpression {
    const call = t.callExpression(t.identifier(hook), args);
    if (typeArgument !== undefined)
        call.typeParameters = t.tsTypeParameterInstantiation([typeArgument]);
    return call;
}

function constant(name: string | t.ArrayPattern, init: t.Expression): t.VariableDeclaration {
    return t.variableDeclaration('const', [
        t.variableDeclarator(typeof name === 'string' ? t.identifier(name) : name, init),
    ]);
}

function emitComponent(
    machine: TExoMachineSource,
    schema: TExoSchemaSource,
    portOf: (node: t.Node) => string | null,
    transitions: ReadonlySet<string>,
    unsupported: string[],
    runtime: Set<string>,
    freshName: (base: string) => string
): t.FunctionDeclaration {
    const stateRef = freshName('stateRef');
    const teardownsRef = freshName('teardownsRef');
    const value = (port: string): string => identifierOf(port);
    const setter = (port: string): string => `set${capitalised(identifierOf(port))}`;
    const handlerState = (port: string): string => `${identifierOf(port)}Handler`;
    const handlerSetter = (port: string): string => `set${capitalised(identifierOf(port))}Handler`;
    const usedHandlerState = new Set<string>();
    const context: TExoRewriteContext = {
        portOf,
        setterOf: setter,
        handlerSetterOf: (port) => {
            usedHandlerState.add(port);
            return handlerSetter(port);
        },
        stateRef,
        teardownsRef,
        transitions,
        unsupported,
        runtime,
    };
    const where = machine.done?.name ?? machine.builder;
    const body: t.Statement[] = [];
    const tail: t.Statement[] = [];

    const rewrittenTransitions = machine.transitions.map(({ name, fn }) =>
        constant(name, rewriteExoConnectorCalls(fn, context, `${where} transition ${name}`))
    );
    const rewrittenHandlers = [...machine.handlers].map(([port, fn]) =>
        constant(
            `on${capitalised(identifierOf(port))}`,
            rewriteExoConnectorCalls(fn, context, `${where} handler ${port}`)
        )
    );
    const initial =
        machine.initial === null
            ? null
            : rewriteExoConnectorCalls(machine.initial, context, `${where} createInitialState`);
    const wire =
        machine.wire === null
            ? null
            : rewriteExoConnectorCalls(machine.wire, context, `${where} wire`);
    const effects = machine.effects.map((fn, i) =>
        rewriteExoConnectorCalls(fn, context, `${where} effect ${i}`)
    );

    for (const [port, source] of schema.ports) {
        if (source.kind === 'event') {
            if (usedHandlerState.has(port)) {
                body.push(
                    constant(
                        t.arrayPattern([
                            t.identifier(handlerState(port)),
                            t.identifier(handlerSetter(port)),
                        ]),
                        useCall(
                            'useState',
                            [t.identifier('undefined')],
                            t.tsUnionType([
                                t.tsFunctionType(
                                    null,
                                    [
                                        Object.assign(t.identifier('event'), {
                                            typeAnnotation: t.tsTypeAnnotation(t.tsNeverKeyword()),
                                        }),
                                    ],
                                    t.tsTypeAnnotation(t.tsVoidKeyword())
                                ),
                                t.tsUndefinedKeyword(),
                            ])
                        )
                    )
                );
            }
            continue;
        }
        if (source.kind === 'ref') {
            body.push(
                constant(
                    `${identifierOf(port)}Ref`,
                    useCall('useRef', [t.nullLiteral()], t.tsTypeReference(t.identifier('Element')))
                )
            );
            continue;
        }
        body.push(
            constant(
                t.arrayPattern([t.identifier(value(port)), t.identifier(setter(port))]),
                useCall(
                    'useState',
                    [
                        source.kind === 'children'
                            ? t.arrayExpression([])
                            : t.identifier('undefined'),
                    ],
                    source.kind === 'children'
                        ? t.tsTypeReference(t.identifier('ReactNode'))
                        : t.tsUnknownKeyword()
                )
            )
        );
    }
    body.push(
        constant(
            stateRef,
            useCall(
                'useRef',
                [t.tsAsExpression(t.identifier('undefined'), t.tsNeverKeyword())],
                machine.stateType ?? t.tsUnknownKeyword()
            )
        )
    );
    body.push(
        constant(
            teardownsRef,
            useCall(
                'useRef',
                [t.arrayExpression([])],
                t.tsArrayType(t.tsFunctionType(null, [], t.tsTypeAnnotation(t.tsVoidKeyword())))
            )
        )
    );
    body.push(...rewrittenTransitions, ...rewrittenHandlers);

    if (initial !== null) {
        tail.push(
            t.expressionStatement(
                useCall('useLayoutEffect', [
                    t.arrowFunctionExpression(
                        [],
                        t.blockStatement([
                            t.expressionStatement(
                                t.assignmentExpression(
                                    '=',
                                    t.memberExpression(
                                        t.identifier(stateRef),
                                        t.identifier('current')
                                    ),
                                    t.tsAsExpression(
                                        t.callExpression(initial, [t.identifier('index')]),
                                        t.tsNeverKeyword()
                                    )
                                )
                            ),
                        ])
                    ),
                    t.arrayExpression([]),
                ])
            )
        );
    }
    if (wire !== null) {
        tail.push(
            t.expressionStatement(
                useCall('useLayoutEffect', [
                    t.arrowFunctionExpression(
                        [],
                        t.blockStatement([
                            t.expressionStatement(t.callExpression(wire, [t.identifier('params')])),
                        ])
                    ),
                    t.arrayExpression([t.identifier('params')]),
                ])
            )
        );
    }
    for (const effect of effects) {
        tail.push(
            t.expressionStatement(
                useCall('useEffect', [
                    t.arrowFunctionExpression([], t.callExpression(effect, [])),
                    t.arrayExpression([]),
                ])
            )
        );
    }
    tail.push(
        t.expressionStatement(
            useCall('useEffect', [
                t.arrowFunctionExpression(
                    [],
                    t.arrowFunctionExpression(
                        [],
                        t.blockStatement([
                            t.forOfStatement(
                                t.variableDeclaration('const', [
                                    t.variableDeclarator(t.identifier('off')),
                                ]),
                                t.memberExpression(
                                    t.identifier(teardownsRef),
                                    t.identifier('current')
                                ),
                                t.expressionStatement(t.callExpression(t.identifier('off'), []))
                            ),
                        ])
                    )
                ),
                t.arrayExpression([]),
            ])
        )
    );

    const markup = emitReactMarkup(schema.root, schema.holder, {
        value,
        handler: (port) =>
            machine.handlers.has(port)
                ? `on${capitalised(identifierOf(port))}`
                : usedHandlerState.has(port)
                ? handlerState(port)
                : null,
        ref: (port) => `${identifierOf(port)}Ref`,
        styleOf: 'exoStyleObject',
    });
    let styled = false;
    traverse(t.file(t.program([t.expressionStatement(markup)])), {
        Identifier(path: NodePath<t.Identifier>) {
            if (path.node.name === 'exoStyleObject') styled = true;
        },
    });
    if (styled) runtime.add('exoStyleObject');

    const props = t.objectPattern([
        t.objectProperty(
            t.identifier('index'),
            t.assignmentPattern(t.identifier('index'), t.numericLiteral(0)),
            false,
            true
        ),
        t.objectProperty(t.identifier('params'), t.identifier('params'), false, true),
    ]);
    props.typeAnnotation = t.tsTypeAnnotation(
        t.tsTypeLiteral([
            Object.assign(
                t.tsPropertySignature(
                    t.identifier('index'),
                    t.tsTypeAnnotation(t.tsNumberKeyword())
                ),
                { optional: true }
            ),
            Object.assign(
                t.tsPropertySignature(
                    t.identifier('params'),
                    t.tsTypeAnnotation(machine.paramsType ?? t.tsUnknownKeyword())
                ),
                { optional: true }
            ),
        ])
    );
    const name = componentNameOf(machine.done?.name ?? machine.builder);
    return t.functionDeclaration(
        t.identifier(name),
        [props],
        t.blockStatement([...body, ...tail, t.returnStatement(markup)])
    );
}

export function translateExoToReact(
    source: string,
    fileName = 'input.tsx',
    runtimePath = './exo-react-runtime'
): TExoTranslation {
    const ast = parseSync(source, {
        filename: fileName,
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
    });
    if (ast === null) throw new Error(`@exodra/to-react: ${fileName} did not parse`);
    const program = (ast as t.File).program;
    const taken = new Set<string>();
    traverse(ast, {
        Identifier(path: NodePath<t.Identifier>) {
            taken.add(path.node.name);
        },
    });
    const freshName = (base: string): string => {
        let name = base;
        for (let i = 2; taken.has(name); i++) name = `${base}${i}`;
        taken.add(name);
        return name;
    };
    const schemas = new Map<string, TExoSchemaSource>();
    const aliases = new Map<string, string>();
    const machines = new Map<string, TExoMachineSource>();
    const transitions = new Set<string>();
    const unsupported: string[] = [];
    const runtime = new Set<string>();
    const remove = new Set<t.Statement>();
    const replaced = new Map<t.Statement, string>();

    for (const statement of program.body) {
        const declaration = t.isExportNamedDeclaration(statement)
            ? statement.declaration
            : statement;
        if (t.isVariableDeclaration(declaration)) {
            for (const declarator of declaration.declarations) {
                if (!t.isIdentifier(declarator.id)) continue;
                const name = declarator.id.name;
                const init = declarator.init;
                if (
                    t.isCallExpression(init) &&
                    t.isIdentifier(init.callee, { name: 'exoJsx' }) &&
                    isFunction(init.arguments[0] as t.Node)
                ) {
                    const fn = init.arguments[0] as TExoFunction;
                    const root = readRoot(fn);
                    if (root === null) {
                        unsupported.push(`${name}: exoJsx body is not one returned element`);
                        continue;
                    }
                    const holder = readHolder(fn);
                    const ports = new Map<string, TExoPortSource>();
                    collectPorts(root, holder, ports);
                    schemas.set(name, { holder, root, ports });
                    remove.add(statement);
                } else if (
                    t.isMemberExpression(init) &&
                    t.isIdentifier(init.object) &&
                    schemas.has(init.object.name) &&
                    t.isIdentifier(init.property, { name: 'ports' })
                ) {
                    aliases.set(name, init.object.name);
                    remove.add(statement);
                } else if (
                    t.isCallExpression(init) &&
                    t.isIdentifier(init.callee, { name: 'createExoMachineBuilder' }) &&
                    t.isIdentifier(init.arguments[0])
                ) {
                    const generics = init.typeParameters?.params ?? [];
                    machines.set(name, {
                        builder: name,
                        schema: (init.arguments[0] as t.Identifier).name,
                        paramsType: generics[1] ?? null,
                        stateType: generics[2] ?? null,
                        initial: null,
                        wire: null,
                        transitions: [],
                        handlers: new Map(),
                        effects: [],
                        done: null,
                        ports: new Map(),
                    });
                    remove.add(statement);
                } else if (
                    t.isCallExpression(init) &&
                    t.isMemberExpression(init.callee) &&
                    t.isIdentifier(init.callee.object) &&
                    machines.has(init.callee.object.name) &&
                    t.isIdentifier(init.callee.property)
                ) {
                    const machine = machines.get(init.callee.object.name) as TExoMachineSource;
                    const method = init.callee.property.name;
                    if (method === 'transition' && isFunction(init.arguments[0] as t.Node)) {
                        machine.transitions.push({ name, fn: init.arguments[0] as TExoFunction });
                        transitions.add(name);
                        remove.add(statement);
                    } else if (method === 'done') {
                        machine.done = { name, exported: t.isExportNamedDeclaration(statement) };
                        replaced.set(statement, init.callee.object.name);
                    } else {
                        unsupported.push(
                            `${name}: ${init.callee.object.name}.${method}(…) has no React form`
                        );
                    }
                }
            }
            continue;
        }
        if (t.isExpressionStatement(statement) && t.isCallExpression(statement.expression)) {
            const call = statement.expression;
            if (
                !t.isMemberExpression(call.callee) ||
                !t.isIdentifier(call.callee.object) ||
                !t.isIdentifier(call.callee.property)
            )
                continue;
            const machine = machines.get(call.callee.object.name);
            if (machine === undefined) continue;
            const method = call.callee.property.name;
            if (!MACHINE_STEPS.has(method)) {
                unsupported.push(`${machine.builder}.${method}(…) has no React form`);
                continue;
            }
            const fn = call.arguments[method === 'on' ? 1 : 0] as t.Node | undefined;
            if (!isFunction(fn)) {
                unsupported.push(
                    `${machine.builder}.${method}(…) is handed something that is not a function literal`
                );
                continue;
            }
            if (method === 'createInitialState') machine.initial = fn;
            else if (method === 'wire') machine.wire = fn;
            else if (method === 'effect') machine.effects.push(fn);
            else if (method === 'on') {
                const port = portOfNode(call.arguments[0] as t.Node);
                if (port === null)
                    unsupported.push(`${machine.builder}.on(…): the port is not a schema port`);
                else machine.handlers.set(port, fn);
            } else {
                unsupported.push(`${machine.builder}.${method}(…) has no React form`);
                continue;
            }
            remove.add(statement);
        }
    }

    function portOfNode(node: t.Node): string | null {
        if (!t.isMemberExpression(node) || node.computed || !t.isIdentifier(node.property))
            return null;
        if (t.isIdentifier(node.object) && aliases.has(node.object.name)) return node.property.name;
        if (
            t.isMemberExpression(node.object) &&
            t.isIdentifier(node.object.object) &&
            schemas.has(node.object.object.name) &&
            t.isIdentifier(node.object.property, { name: 'ports' })
        ) {
            return node.property.name;
        }
        return null;
    }

    const body: t.Statement[] = [];
    let usesReact = false;
    for (const statement of program.body) {
        if (t.isImportDeclaration(statement) && EXODRA_SOURCES.test(statement.source.value))
            continue;
        if (remove.has(statement)) continue;
        const builder = replaced.get(statement);
        if (builder === undefined) {
            body.push(statement);
            continue;
        }
        const machine = machines.get(builder) as TExoMachineSource;
        const schema = schemas.get(machine.schema);
        if (schema === undefined || machine.done === null) {
            unsupported.push(`${builder}: its schema is not an exoJsx declaration in this file`);
            continue;
        }
        usesReact = true;
        const component = emitComponent(
            machine,
            schema,
            portOfNode,
            transitions,
            unsupported,
            runtime,
            freshName
        );
        body.push(machine.done.exported ? t.exportNamedDeclaration(component) : component);
        const alias = constant(
            machine.done.name,
            t.identifier((component.id as t.Identifier).name)
        );
        body.push(machine.done.exported ? t.exportNamedDeclaration(alias) : alias);
    }

    const imports: t.Statement[] = [];
    if (usesReact) {
        imports.push(
            t.importDeclaration(
                ['useEffect', 'useLayoutEffect', 'useRef', 'useState'].map((name) =>
                    t.importSpecifier(t.identifier(name), t.identifier(name))
                ),
                t.stringLiteral('react')
            ),
            Object.assign(
                t.importDeclaration(
                    [t.importSpecifier(t.identifier('ReactNode'), t.identifier('ReactNode'))],
                    t.stringLiteral('react')
                ),
                { importKind: 'type' as const }
            )
        );
    }
    if (runtime.size > 0) {
        imports.push(
            t.importDeclaration(
                [...runtime]
                    .sort()
                    .map((name) => t.importSpecifier(t.identifier(name), t.identifier(name))),
                t.stringLiteral(runtimePath)
            )
        );
    }
    const output = t.file(t.program([...imports, ...body], program.directives, 'module'));
    const generated = transformFromAstSync(output, source, {
        filename: fileName,
        babelrc: false,
        configFile: false,
        code: true,
        ast: false,
        retainLines: false,
    });
    return {
        code: generated?.code ?? '',
        runtime: runtime.size > 0 ? EXO_REACT_CHILDREN_RUNTIME : null,
        unsupported,
    };
}
