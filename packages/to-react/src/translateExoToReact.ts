import { parseSync, traverse, transformFromAstSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import * as t from '@babel/types';
import { emitReactMarkup } from './emitReactMarkup';
import { EXO_REACT_RUNTIME } from './EXO_REACT_RUNTIME';
import { EXO_REACT_RUNTIME_EXPORTS } from './constants/EXO_REACT_RUNTIME_EXPORTS';
import type { TExoElementPortsSource } from './types/TExoElementPortsSource';
import type { TExoPortSource } from './types/TExoPortSource';
import type { TExoTranslation } from './types/TExoTranslation';

type TExoFunction = t.ArrowFunctionExpression | t.FunctionExpression;

const EXODRA_SOURCE = /^@exodra\//;

const MACHINE_FACTORIES: ReadonlySet<string> = new Set(['composeExoMachine', 'createExoMachine']);

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

function emitSchema(
    call: t.CallExpression,
    runtime: Set<string>,
    view: string,
    where: string,
    unsupported: string[]
): t.Expression | null {
    const fn = call.arguments[0] as t.Node | undefined;
    if (!isFunction(fn)) {
        unsupported.push(`${where}: exoJsx(…) is handed something that is not a function literal`);
        return null;
    }
    const root = readRoot(fn);
    if (root === null) {
        unsupported.push(`${where}: exoJsx body is not one returned element`);
        return null;
    }
    const holder = readHolder(fn);
    const ports = new Map<string, TExoPortSource>();
    collectPorts(root, holder, ports);
    const elements: TExoElementPortsSource[] = [];
    const markup = emitReactMarkup(root, holder, view, elements, runtime);
    runtime.add('exoReactSchema');
    runtime.add('TExoReactView');
    const schema = t.callExpression(t.identifier('exoReactSchema'), [
        t.objectExpression(
            [...ports.values()].map((port) =>
                t.objectProperty(t.stringLiteral(port.name), t.stringLiteral(port.kind))
            )
        ),
        t.arrayExpression(
            elements.map((element) =>
                t.objectExpression([
                    t.objectProperty(
                        t.identifier('ref'),
                        element.ref === null ? t.nullLiteral() : t.stringLiteral(element.ref)
                    ),
                    t.objectProperty(
                        t.identifier('props'),
                        t.arrayExpression(
                            element.props.map(([port, property]) =>
                                t.arrayExpression([
                                    t.stringLiteral(port),
                                    t.stringLiteral(property),
                                ])
                            )
                        )
                    ),
                ])
            )
        ),
        t.arrowFunctionExpression(
            [
                Object.assign(t.identifier(view), {
                    typeAnnotation: t.tsTypeAnnotation(
                        t.tsTypeReference(t.identifier('TExoReactView'))
                    ),
                }),
            ],
            markup
        ),
    ]);
    if (call.typeParameters !== undefined && call.typeParameters !== null) {
        schema.typeParameters = call.typeParameters as t.TSTypeParameterInstantiation;
    }
    return schema;
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
    const unsupported: string[] = [];
    const runtime = new Set<string>();
    const view = freshName('v');
    const jsxLocals = new Set<string>();
    let importsRuntime = false;

    for (const statement of program.body) {
        if (!t.isImportDeclaration(statement) || !EXODRA_SOURCE.test(statement.source.value))
            continue;
        const from = statement.source.value;
        statement.specifiers = statement.specifiers.filter((specifier) => {
            if (!t.isImportSpecifier(specifier)) {
                unsupported.push(
                    `${fileName}: a default or namespace import of ${from} has no React form`
                );
                return false;
            }
            const imported = t.isIdentifier(specifier.imported)
                ? specifier.imported.name
                : specifier.imported.value;
            if (imported === 'exoJsx') {
                jsxLocals.add(specifier.local.name);
                return false;
            }
            if (!EXO_REACT_RUNTIME_EXPORTS.has(imported)) {
                unsupported.push(`${imported} from ${from} has no React form`);
                return false;
            }
            return true;
        });
        statement.source = t.stringLiteral(runtimePath);
        if (statement.specifiers.length > 0) importsRuntime = true;
    }
    program.body = program.body.filter(
        (statement) =>
            !(
                t.isImportDeclaration(statement) &&
                statement.source.value === runtimePath &&
                statement.specifiers.length === 0
            )
    );

    traverse(ast, {
        CallExpression(path: NodePath<t.CallExpression>) {
            const callee = path.node.callee;
            if (!t.isIdentifier(callee) || !jsxLocals.has(callee.name)) return;
            const declarator = path.findParent((parent) => parent.isVariableDeclarator());
            const where =
                declarator !== null &&
                t.isVariableDeclarator(declarator.node) &&
                t.isIdentifier(declarator.node.id)
                    ? declarator.node.id.name
                    : fileName;
            const schema = emitSchema(path.node, runtime, view, where, unsupported);
            if (schema !== null) path.replaceWith(schema);
        },
    });

    const components: t.Statement[] = [];
    for (const statement of program.body) {
        if (
            !t.isExportNamedDeclaration(statement) ||
            !t.isVariableDeclaration(statement.declaration)
        ) {
            continue;
        }
        for (const declarator of statement.declaration.declarations) {
            const init = declarator.init;
            if (
                !t.isIdentifier(declarator.id) ||
                !t.isCallExpression(init) ||
                !t.isIdentifier(init.callee) ||
                !MACHINE_FACTORIES.has(init.callee.name)
            ) {
                continue;
            }
            runtime.add('exoReactComponent');
            components.push(
                t.exportNamedDeclaration(
                    t.variableDeclaration('const', [
                        t.variableDeclarator(
                            t.identifier(freshName(componentNameOf(declarator.id.name))),
                            t.callExpression(t.identifier('exoReactComponent'), [
                                t.identifier(declarator.id.name),
                            ])
                        ),
                    ])
                )
            );
        }
    }

    const imports: t.Statement[] = [];
    const values = [...runtime].filter((name) => !name.startsWith('T')).sort();
    const types = [...runtime].filter((name) => name.startsWith('T')).sort();
    if (values.length > 0) {
        imports.push(
            t.importDeclaration(
                values.map((name) => t.importSpecifier(t.identifier(name), t.identifier(name))),
                t.stringLiteral(runtimePath)
            )
        );
    }
    if (types.length > 0) {
        imports.push(
            Object.assign(
                t.importDeclaration(
                    types.map((name) => t.importSpecifier(t.identifier(name), t.identifier(name))),
                    t.stringLiteral(runtimePath)
                ),
                { importKind: 'type' as const }
            )
        );
    }
    const output = t.file(
        t.program([...imports, ...program.body, ...components], program.directives, 'module')
    );
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
        runtime: runtime.size > 0 || importsRuntime ? EXO_REACT_RUNTIME : null,
        unsupported,
    };
}
