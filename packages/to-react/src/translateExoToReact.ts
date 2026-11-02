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

type TExoMachineBaseSource = {
    readonly exported: boolean;
    readonly schema: string;
    readonly paramsType: t.TSType | null;
    readonly stateType: t.TSType | null;
    readonly initial: TExoFunction | null;
};

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

function readInitialState(
    machine: string,
    options: t.Node | undefined,
    unsupported: string[]
): TExoFunction | null {
    if (options === undefined) return null;
    if (!t.isObjectExpression(options)) {
        unsupported.push(`${machine}: the machine options are not an object literal`);
        return null;
    }
    let initial: TExoFunction | null = null;
    for (const property of options.properties) {
        if (
            !(t.isObjectProperty(property) || t.isObjectMethod(property)) ||
            property.computed ||
            !t.isIdentifier(property.key)
        ) {
            unsupported.push(`${machine}: a machine option is not a plain named property`);
            continue;
        }
        if (property.key.name !== 'createInitialState') {
            unsupported.push(
                `${machine}: the machine option ${property.key.name} has no React form`
            );
            continue;
        }
        if (t.isObjectMethod(property)) {
            initial = t.functionExpression(
                null,
                property.params as Parameters<typeof t.functionExpression>[1],
                property.body,
                property.generator,
                property.async
            );
        } else if (t.isObjectProperty(property) && isFunction(property.value)) {
            initial = property.value;
        } else {
            unsupported.push(
                `${machine}: createInitialState is handed something that is not a function literal`
            );
        }
    }
    return initial;
}

function functionStatements(fn: TExoFunction): t.Statement[] {
    return t.isBlockStatement(fn.body) ? fn.body.body : [t.expressionStatement(fn.body)];
}

function returnedExpression(fn: TExoFunction): t.Node | null | undefined {
    if (!t.isBlockStatement(fn.body)) return fn.body;
    const only = fn.body.body.length === 1 ? fn.body.body[0] : null;
    return t.isReturnStatement(only) ? only.argument : null;
}

function machineFrom(
    base: TExoMachineBaseSource,
    name: string,
    exported: boolean
): TExoMachineSource {
    return {
        name,
        exported,
        schema: base.schema,
        paramsType: base.paramsType,
        stateType: base.stateType,
        initial: base.initial,
        wire: null,
        transitions: [],
        transitionNames: new Map(),
        handlers: new Map(),
        effects: [],
    };
}

function readMachineBase(
    name: string,
    exported: boolean,
    call: t.CallExpression,
    unsupported: string[]
): TExoMachineBaseSource | null {
    const schema = call.arguments[0];
    if (!t.isIdentifier(schema)) {
        unsupported.push(`${name}: createExoMachine(…) is handed a schema that is not a name`);
        return null;
    }
    const generics = call.typeParameters?.params ?? [];
    return {
        exported,
        schema: schema.name,
        paramsType: generics[1] ?? null,
        stateType: generics[2] ?? null,
        initial: readInitialState(name, call.arguments[1], unsupported),
    };
}

function readCalls(
    machine: string,
    decorator: string,
    declare: t.Node | undefined,
    unsupported: string[]
): { readonly call: t.CallExpression; readonly kept: boolean }[] {
    const param = isFunction(declare) ? declare.params[0] : undefined;
    if (!isFunction(declare) || !t.isIdentifier(param)) {
        unsupported.push(
            `${machine}: ${decorator}(…) is handed something that is not a function literal`
        );
        return [];
    }
    const declarer = param.name;
    const calls: { readonly call: t.CallExpression; readonly kept: boolean }[] = [];
    for (const statement of functionStatements(declare)) {
        const init =
            t.isVariableDeclaration(statement) && statement.declarations.length === 1
                ? statement.declarations[0].init
                : null;
        if (
            t.isExpressionStatement(statement) &&
            t.isCallExpression(statement.expression) &&
            t.isIdentifier(statement.expression.callee, { name: declarer })
        ) {
            calls.push({ call: statement.expression, kept: false });
        } else if (t.isCallExpression(init) && t.isIdentifier(init.callee, { name: declarer })) {
            calls.push({ call: init, kept: true });
        } else {
            unsupported.push(
                `${machine}: ${decorator}(…) declares something other than ${declarer}(…) calls`
            );
        }
    }
    return calls;
}

function readMachineStep(
    machine: TExoMachineSource,
    step: t.Node,
    portOf: (node: t.Node) => string | null,
    unsupported: string[]
): void {
    const name = machine.name;
    const param = isFunction(step) ? step.params[0] : undefined;
    const decorator = isFunction(step) ? returnedExpression(step) : null;
    if (
        !t.isIdentifier(param) ||
        !t.isCallExpression(decorator) ||
        !t.isIdentifier(decorator.callee) ||
        !t.isIdentifier(decorator.arguments[0], { name: param.name })
    ) {
        unsupported.push(`${name}: a composeExoMachine step is not one decorator call`);
        return;
    }
    const method = decorator.callee.name;
    const declare = decorator.arguments[1] as t.Node | undefined;
    if (method === 'withExoTransitions') {
        if (!t.isObjectExpression(declare)) {
            unsupported.push(
                `${name}: withExoTransitions(…) is handed something that is not an object literal`
            );
            return;
        }
        for (const property of declare.properties) {
            if (
                !(t.isObjectProperty(property) || t.isObjectMethod(property)) ||
                property.computed ||
                !t.isIdentifier(property.key)
            ) {
                unsupported.push(`${name}: a transition is not a plain named property`);
                continue;
            }
            const key = property.key.name;
            if (t.isObjectMethod(property)) {
                machine.transitions.push({
                    key,
                    fn: t.functionExpression(
                        null,
                        property.params as Parameters<typeof t.functionExpression>[1],
                        property.body,
                        property.generator,
                        property.async
                    ),
                });
            } else if (isFunction(property.value)) {
                machine.transitions.push({ key, fn: property.value });
            } else {
                unsupported.push(`${name}: the transition ${key} is not a function literal`);
            }
        }
        return;
    }
    if (method === 'withExoWire') {
        if (!isFunction(declare)) {
            unsupported.push(
                `${name}: withExoWire(…) is handed something that is not a function literal`
            );
        } else if (machine.wire !== null) {
            unsupported.push(`${name}: withExoWire(…) is applied twice; a machine has one wire`);
        } else {
            machine.wire = declare;
        }
        return;
    }
    if (method === 'withExoHandlers') {
        for (const { call: on, kept } of readCalls(name, method, declare, unsupported)) {
            const fn = on.arguments[1] as t.Node | undefined;
            const port = portOf(on.arguments[0] as t.Node);
            if (kept) {
                unsupported.push(`${name}: on(…) returns nothing to keep`);
            } else if (!isFunction(fn)) {
                unsupported.push(
                    `${name}: on(…) is handed something that is not a function literal`
                );
            } else if (port === null) {
                unsupported.push(`${name}: on(…): the port is not a schema port`);
            } else if (machine.handlers.has(port)) {
                unsupported.push(`${name}: on(…): a second handler on ${port} has no React form`);
            } else {
                machine.handlers.set(port, fn);
            }
        }
        return;
    }
    if (method === 'withExoEffects') {
        for (const { call: effect, kept } of readCalls(name, method, declare, unsupported)) {
            const fn = effect.arguments[0] as t.Node | undefined;
            if (kept) {
                unsupported.push(`${name}: an effect handle kept in a variable has no React form`);
            } else if (!isFunction(fn)) {
                unsupported.push(
                    `${name}: effect(…) is handed something that is not a function literal`
                );
            } else {
                machine.effects.push(fn);
            }
        }
        return;
    }
    unsupported.push(`${name}: ${method}(…) has no React form`);
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
    const words = constant
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word !== '');
    if (words.length > 1 && words[words.length - 1] === 'machine') words.pop();
    return words.map(capitalised).join('');
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
    const where = machine.name;
    const body: t.Statement[] = [];
    const tail: t.Statement[] = [];

    const rewrittenTransitions = machine.transitions.map(({ key, fn }) =>
        constant(
            machine.transitionNames.get(key) ?? key,
            rewriteExoConnectorCalls(fn, context, `${where} transition ${key}`)
        )
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
                                        t.callExpression(initial, [t.identifier('params')]),
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
        t.objectProperty(t.identifier('params'), t.identifier('params'), false, true),
    ]);
    props.typeAnnotation = t.tsTypeAnnotation(
        t.tsTypeLiteral([
            Object.assign(
                t.tsPropertySignature(
                    t.identifier('params'),
                    t.tsTypeAnnotation(machine.paramsType ?? t.tsUnknownKeyword())
                ),
                { optional: true }
            ),
        ])
    );
    const name = componentNameOf(machine.name);
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
    const references = new Map<string, number>();
    const members: {
        readonly object: string;
        readonly property: string;
        readonly called: boolean;
        readonly node: t.MemberExpression;
    }[] = [];
    traverse(ast, {
        Identifier(path: NodePath<t.Identifier>) {
            const name = path.node.name;
            taken.add(name);
            if (path.isReferencedIdentifier() && !path.parentPath.isTSTypeQuery()) {
                references.set(name, (references.get(name) ?? 0) + 1);
            }
        },
        MemberExpression(path: NodePath<t.MemberExpression>) {
            const node = path.node;
            if (node.computed || !t.isIdentifier(node.object) || !t.isIdentifier(node.property))
                return;
            members.push({
                object: node.object.name,
                property: node.property.name,
                called: path.parentPath.isCallExpression({ callee: node }),
                node,
            });
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
    const bases = new Map<string, TExoMachineBaseSource>();
    const baseStatements = new Map<string, t.Statement>();
    const composedBases = new Map<string, number>();
    const machines = new Map<string, TExoMachineSource>();
    const transitions = new Set<string>();
    const unsupported: string[] = [];
    const runtime = new Set<string>();
    const remove = new Set<t.Statement>();
    const replaced = new Map<t.Statement, string>();
    const consumed = new Set<t.Node>();

    for (const statement of program.body) {
        const exported = t.isExportNamedDeclaration(statement);
        const declaration = t.isExportNamedDeclaration(statement)
            ? statement.declaration
            : statement;
        if (!t.isVariableDeclaration(declaration)) continue;
        for (const declarator of declaration.declarations) {
            const init = declarator.init;
            if (
                t.isObjectPattern(declarator.id) &&
                t.isMemberExpression(init) &&
                !init.computed &&
                t.isIdentifier(init.object) &&
                machines.has(init.object.name) &&
                t.isIdentifier(init.property, { name: 'transitions' })
            ) {
                const machine = machines.get(init.object.name) as TExoMachineSource;
                consumed.add(init);
                remove.add(statement);
                if (exported) {
                    unsupported.push(
                        `${machine.name}.transitions: an exported transition has no React form outside its component`
                    );
                }
                for (const property of declarator.id.properties) {
                    if (
                        t.isObjectProperty(property) &&
                        !property.computed &&
                        t.isIdentifier(property.key) &&
                        t.isIdentifier(property.value)
                    ) {
                        machine.transitionNames.set(property.key.name, property.value.name);
                        transitions.add(property.value.name);
                    } else {
                        unsupported.push(
                            `${machine.name}.transitions: a destructured transition is not a plain name`
                        );
                    }
                }
                continue;
            }
            if (!t.isIdentifier(declarator.id)) continue;
            const name = declarator.id.name;
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
                t.isIdentifier(init.callee, { name: 'createExoMachine' })
            ) {
                const base = readMachineBase(name, exported, init, unsupported);
                if (base !== null) {
                    bases.set(name, base);
                    baseStatements.set(name, statement);
                }
            } else if (
                t.isCallExpression(init) &&
                t.isIdentifier(init.callee, { name: 'composeExoMachine' })
            ) {
                const first = init.arguments[0];
                const base = t.isIdentifier(first)
                    ? bases.get(first.name)
                    : t.isCallExpression(first) &&
                      t.isIdentifier(first.callee, { name: 'createExoMachine' })
                    ? readMachineBase(name, exported, first, unsupported)
                    : null;
                if (base === undefined || base === null) {
                    unsupported.push(
                        `${name}: composeExoMachine(…) does not start from a createExoMachine(…) of this file`
                    );
                    continue;
                }
                if (t.isIdentifier(first)) {
                    composedBases.set(first.name, (composedBases.get(first.name) ?? 0) + 1);
                }
                const machine = machineFrom(base, name, exported);
                for (const step of init.arguments.slice(1)) {
                    readMachineStep(machine, step, portOfNode, unsupported);
                }
                machines.set(name, machine);
                replaced.set(statement, name);
            }
        }
    }

    for (const [name, base] of bases) {
        const statement = baseStatements.get(name) as t.Statement;
        if (base.exported || (references.get(name) ?? 0) > (composedBases.get(name) ?? 0)) {
            machines.set(name, machineFrom(base, name, base.exported));
            replaced.set(statement, name);
        } else {
            remove.add(statement);
        }
    }

    for (const member of members) {
        if (machines.has(member.object) && !consumed.has(member.node)) {
            unsupported.push(
                `${member.object}.${member.property}${member.called ? '(…)' : ''} has no React form`
            );
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
        const name = replaced.get(statement);
        if (name === undefined) {
            body.push(statement);
            continue;
        }
        const machine = machines.get(name) as TExoMachineSource;
        const schema = schemas.get(machine.schema);
        if (schema === undefined) {
            unsupported.push(`${name}: its schema is not an exoJsx declaration in this file`);
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
        body.push(machine.exported ? t.exportNamedDeclaration(component) : component);
        const alias = constant(machine.name, t.identifier((component.id as t.Identifier).name));
        body.push(machine.exported ? t.exportNamedDeclaration(alias) : alias);
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
