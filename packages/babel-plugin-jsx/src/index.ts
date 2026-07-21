import type { PluginObj, NodePath, ConfigAPI } from '@babel/core';
import * as t from '@babel/types';
import { optimizeStaticSchemas } from './static-hoisting';

interface PluginOptions {
    importSource?: string;
    pragma?: string;
    pragmaFrag?: string;
    hoistStatic?: boolean;
}

const EXODRA_DIRECTIVES = ['exo:schema'];

type JSXChild = t.JSXElement | t.JSXFragment | t.JSXExpressionContainer | t.JSXText | t.JSXSpreadChild;

function babelPluginExodraJsx(api: ConfigAPI, options: PluginOptions): PluginObj {
    api.assertVersion(7);

    const importSource = options.importSource ?? '@exodra/core';
    const pragma = options.pragma ?? 'h';
    const pragmaFrag = options.pragmaFrag ?? 'Fragment';

    let pragmaImported = false;
    let fragmentImported = false;
    let textImported = false;
    // Directive runtime imports: mergeAttrs from @exodra/jsx, bind* from
    // @exodra/forms. Only injected when actually used (pay for what you use).
    let mergeAttrsImported = false;
    const formsHelpers = new Set<string>();

    return {
        name: '@exodra/babel-plugin-jsx',
        // inherits: require('@babel/plugin-syntax-jsx').default,
        visitor: {
            Program: {
                enter() {
                    // Reset import flags for each file
                    pragmaImported = false;
                    fragmentImported = false;
                    textImported = false;
                    mergeAttrsImported = false;
                    formsHelpers.clear();
                },
                exit(path) {
                    // Optimize static schemas if enabled
                    if (options.hoistStatic !== false) {
                        optimizeStaticSchemas(path);
                    }
                    
                    const body = path.node.body;

                    // `h` and `text` come from the pragma import source (default
                    // @exodra/core). `Fragment` and `mergeAttrs` come from
                    // @exodra/jsx — the JSX runtime — NOT the pragma source, since
                    // @exodra/core does not export them.
                    const coreImports: t.ImportSpecifier[] = [];
                    if (pragmaImported) {
                        coreImports.push(
                            t.importSpecifier(
                                t.identifier(pragma),
                                t.identifier(pragma)
                            )
                        );
                    }
                    if (textImported) {
                        coreImports.push(
                            t.importSpecifier(
                                t.identifier('text'),
                                t.identifier('text')
                            )
                        );
                    }

                    const jsxImports: t.ImportSpecifier[] = [];
                    if (fragmentImported) {
                        jsxImports.push(
                            t.importSpecifier(
                                t.identifier(pragmaFrag),
                                t.identifier(pragmaFrag)
                            )
                        );
                    }
                    if (mergeAttrsImported) {
                        jsxImports.push(
                            t.importSpecifier(
                                t.identifier('mergeAttrs'),
                                t.identifier('mergeAttrs')
                            )
                        );
                    }

                    const prelude: t.ImportDeclaration[] = [];
                    if (coreImports.length > 0) {
                        prelude.push(
                            t.importDeclaration(
                                coreImports,
                                t.stringLiteral(importSource)
                            )
                        );
                    }
                    if (jsxImports.length > 0) {
                        prelude.push(
                            t.importDeclaration(
                                jsxImports,
                                t.stringLiteral('@exodra/jsx')
                            )
                        );
                    }
                    if (formsHelpers.size > 0) {
                        prelude.push(
                            t.importDeclaration(
                                [...formsHelpers].sort().map(name =>
                                    t.importSpecifier(
                                        t.identifier(name),
                                        t.identifier(name)
                                    )
                                ),
                                t.stringLiteral('@exodra/forms')
                            )
                        );
                    }
                    if (prelude.length > 0) {
                        path.node.body = [...prelude, ...body];
                    }
                }
            },

            JSXElement(path: NodePath<t.JSXElement>) {
                pragmaImported = true;
                const transformed = transformJSXElement(path.node, pragma);
                // Check if text was used
                if (hasTextCall(transformed)) {
                    textImported = true;
                }
                // Check if Fragment was used
                if (hasFragmentCall(transformed, pragmaFrag)) {
                    fragmentImported = true;
                }
                // Detect directive runtime calls for auto-import.
                const callees = new Set<string>();
                collectCallees(transformed, callees);
                if (callees.has('mergeAttrs')) mergeAttrsImported = true;
                for (const name of FORMS_BIND_HELPERS) {
                    if (callees.has(name)) formsHelpers.add(name);
                }
                path.replaceWith(transformed);
            },

            JSXFragment(path: NodePath<t.JSXFragment>) {
                pragmaImported = true;
                const transformed = transformJSXFragment(path.node, pragma, pragmaFrag);
                // Check if Fragment component was used (not just array)
                if (t.isCallExpression(transformed)) {
                    fragmentImported = true;
                }
                // Check if text was used
                if (hasTextCall(transformed)) {
                    textImported = true;
                }
                path.replaceWith(transformed);
            }
        }
    } as PluginObj;
}

function transformJSXElement(node: t.JSXElement, pragma: string): t.CallExpression {
    const openingElement = node.openingElement;
    const tagName = getTagName(openingElement.name);
    
    
    // Collect attributes into buckets based on prop names
    const staticProps: Array<t.ObjectProperty> = [];
    const bindables: Array<t.ObjectProperty> = [];
    const bindableLists: Array<t.ObjectProperty> = [];
    const handlers: Array<t.ObjectProperty> = [];
    const bindableHandlers: Array<t.ObjectProperty> = [];
    const directives: Array<{ name: string; value: t.Expression | null }> = [];
    // `bind:value` / `bind:checked` directives → runtime helper calls (T1).
    const binds: Array<{ target: string; value: t.Expression | null }> = [];
    // `cache:key={EXPR}` → 3rd arg of h() (schema.cacheKey, a clone-cache key).
    let cacheKey: t.Expression | null = null;

    // Process attributes - look for special props: static, bindable, bindableList
    for (const attr of openingElement.attributes) {
        if (t.isJSXAttribute(attr)) {
            const attrValue = getAttributeValue(attr.value);
            const attrName = getAttributeName(attr.name);
            
            // Check for special three props
            if (attrName === 'static' && attrValue) {
                // static prop contains static object
                if (t.isObjectExpression(attrValue)) {
                    staticProps.push(...attrValue.properties.filter(p => t.isObjectProperty(p)) as t.ObjectProperty[]);
                }
                continue;
            }
            
            if (attrName === 'bindable' && attrValue) {
                // bindable prop contains bindables object
                if (t.isObjectExpression(attrValue)) {
                    bindables.push(...attrValue.properties.filter(p => t.isObjectProperty(p)) as t.ObjectProperty[]);
                }
                continue;
            }
            
            if (attrName === 'bindableList' && attrValue) {
                // bindableList prop contains bindableLists object
                if (t.isObjectExpression(attrValue)) {
                    bindableLists.push(...attrValue.properties.filter(p => t.isObjectProperty(p)) as t.ObjectProperty[]);
                }
                continue;
            }
            
            // Support both singular and plural forms
            if ((attrName === 'handler' || attrName === 'handlers') && attrValue) {
                // handler/handlers prop contains handlers object
                if (t.isObjectExpression(attrValue)) {
                    handlers.push(...attrValue.properties.filter(p => t.isObjectProperty(p)) as t.ObjectProperty[]);
                }
                continue;
            }
            
            if ((attrName === 'bindableHandler' || attrName === 'bindableHandlers') && attrValue) {
                // bindableHandler/bindableHandlers prop contains bindableHandlers object
                if (t.isObjectExpression(attrValue)) {
                    bindableHandlers.push(...attrValue.properties.filter(p => t.isObjectProperty(p)) as t.ObjectProperty[]);
                }
                continue;
            }
            
            // Check for Exodra directives
            if (EXODRA_DIRECTIVES.includes(attrName)) {
                directives.push({ name: attrName, value: attrValue });
                continue;
            }

            // Two-way binding directive: `bind:value` / `bind:checked`.
            if (attrName.startsWith('bind:')) {
                binds.push({ target: attrName.slice(5), value: attrValue });
                continue;
            }

            // Clone-cache directive: `cacheKey={EXPR}` → schema.cacheKey.
            // Also support cache:key for backwards compat
            if (attrName === 'cacheKey' || attrName === 'cache:key') {
                cacheKey = attrValue;
                continue;
            }

            // STRICT: no flat attributes at all. Every prop must declare its
            // bucket — static / bindable / bindableList / handlers /
            // bindableHandlers — so the static/reactive/event split is always
            // explicit (Exodra's core principle). A flat `onClick` would silently
            // land in `static` (a dead handler); a flat `class` blurs the split.
            // Fail loud and point at the right bucket.
            if (/^on[A-Z]/.test(attrName)) {
                throw new Error(
                    `Exodra JSX: flat event prop "${attrName}" is not allowed. ` +
                        `Use handlers={{ ${attrName}: ... }} (or ` +
                        `bindableHandlers={{ ${attrName}: ... }} for a reactive ` +
                        `handler). Lifecycle hooks go in static={{ onExoMount }}.`
                );
            }
            throw new Error(
                `Exodra JSX: flat attribute "${attrName}" is not allowed. ` +
                    `Put it in a bucket — static={{ "${attrName}": ... }} for a ` +
                    `plain attribute, bindable={{ ${attrName}: signal }} for a ` +
                    `reactive one.`
            );
        } else if (t.isJSXSpreadAttribute(attr)) {
            // Spread attributes are not supported - use exo:schema instead
            // Silently ignore or could throw compile error
        }
    }
    
    // Process children - just transform them normally
    // NO SPECIAL HANDLING FOR BINDABLE LISTS IN CHILDREN
    const children = transformChildren(node.children, pragma, 'Fragment');
    if (children) {
        if (t.isArrayExpression(children) && children.elements.length === 1) {
            // Single child - don't wrap in array
            staticProps.push(
                t.objectProperty(t.identifier('children'), children.elements[0] as t.Expression)
            );
        } else if (t.isArrayExpression(children) && children.elements.length > 1) {
            // Multiple children
            staticProps.push(
                t.objectProperty(t.identifier('children'), children)
            );
        } else if (!t.isArrayExpression(children)) {
            // Single expression child
            staticProps.push(
                t.objectProperty(t.identifier('children'), children)
            );
        }
    }
    
    // Handle directives - only exo:schema now
    let schemaValue: t.Expression | null = null;
    
    for (const directive of directives) {
        if (directive.name === 'exo:schema' && directive.value) {
            // exo:schema replaces the entire schema props
            schemaValue = directive.value;
        }
    }
    
    // Build the schema props object
    const schemaProps: Array<t.ObjectProperty> = [];
    
    if (staticProps.length > 0) {
        schemaProps.push(
            t.objectProperty(
                t.identifier('static'),
                t.objectExpression(staticProps)
            )
        );
    }
    
    if (bindables.length > 0) {
        schemaProps.push(
            t.objectProperty(
                t.identifier('bindables'),
                t.objectExpression(bindables)
            )
        );
    }
    
    if (bindableLists.length > 0) {
        schemaProps.push(
            t.objectProperty(
                t.identifier('bindableLists'),
                t.objectExpression(bindableLists)
            )
        );
    }
    
    if (handlers.length > 0) {
        schemaProps.push(
            t.objectProperty(
                t.identifier('handlers'),
                t.objectExpression(handlers)
            )
        );
    }
    
    if (bindableHandlers.length > 0) {
        schemaProps.push(
            t.objectProperty(
                t.identifier('bindableHandlers'),
                t.objectExpression(bindableHandlers)
            )
        );
    }
    
    // Directive runtime calls (bind:value / bind:checked). The compiler picks the
    // specific helper per element type, so only used variants get imported.
    const directiveCalls = binds.map(bind =>
        t.callExpression(
            t.identifier(bindHelperName(tagName, bind.target, staticProps)),
            [bind.value ?? t.nullLiteral()]
        )
    );

    // Generate the h() call. When an element has directives, the second argument
    // becomes mergeAttrs(baseProps, ...directiveCalls) — one shared runtime call,
    // never inlined logic. Plain elements keep the bare object literal.
    const baseArg = schemaValue ?? t.objectExpression(schemaProps);
    let secondArg: t.Expression | null;
    if (directiveCalls.length > 0) {
        secondArg = t.callExpression(t.identifier('mergeAttrs'), [
            baseArg,
            ...directiveCalls,
        ]);
    } else if (schemaValue) {
        secondArg = schemaValue;
    } else if (schemaProps.length === 0) {
        secondArg = null;
    } else {
        secondArg = t.objectExpression(schemaProps);
    }

    const args: t.Expression[] = [t.stringLiteral(tagName)];
    if (cacheKey) {
        // h(tag, attrs, cacheKey) — ensure the attrs slot exists for the 3rd arg.
        args.push(secondArg ?? t.objectExpression([]));
        args.push(cacheKey);
    } else if (secondArg) {
        args.push(secondArg);
    }

    const hCall = t.callExpression(t.identifier(pragma), args);

    return hCall;
}

// Pick the runtime bind helper at compile time from the element type, so the
// bundle only pulls the variants actually used.
function bindHelperName(
    tagName: string,
    target: string,
    staticProps: Array<t.ObjectProperty>
): string {
    if (target === 'checked') return 'bindChecked';
    if (tagName === 'select') return 'bindSelect';
    if (tagName === 'textarea') return 'bindText';
    const type = staticStringProp(staticProps, 'type');
    if (type === 'number' || type === 'range') return 'bindNumber';
    if (type === 'checkbox' || type === 'radio') return 'bindChecked';
    return 'bindText';
}

function staticStringProp(
    staticProps: Array<t.ObjectProperty>,
    name: string
): string | undefined {
    for (const prop of staticProps) {
        const key = t.isIdentifier(prop.key)
            ? prop.key.name
            : t.isStringLiteral(prop.key)
              ? prop.key.value
              : '';
        if (key === name && t.isStringLiteral(prop.value)) {
            return prop.value.value;
        }
    }
    return undefined;
}

function transformJSXFragment(node: t.JSXFragment, pragma: string, pragmaFrag: string): t.Expression {
    const children = transformChildren(node.children, pragma, pragmaFrag);
    
    if (!children || (t.isArrayExpression(children) && children.elements.length === 0)) {
        // Empty fragment returns empty array
        return t.arrayExpression([]);
    }
    
    // Check if fragment has a bindableList child (single expression like {items})
    if (!t.isArrayExpression(children) && t.isIdentifier(children)) {
        // Single identifier - might be a bindableList
        // Return h(Fragment, ...) with bindableLists
        return t.callExpression(
            t.identifier(pragma),
            [
                t.identifier(pragmaFrag),
                t.objectExpression([
                    t.objectProperty(
                        t.identifier('bindableLists'),
                        t.objectExpression([
                            t.objectProperty(t.identifier('children'), children)
                        ])
                    )
                ])
            ]
        );
    }
    
    // For static children, fragment returns array directly
    return children;
}

function transformChildren(children: Array<JSXChild>, pragma: string, pragmaFrag: string = 'Fragment'): t.Expression | null {
    const transformedChildren: Array<t.Expression> = [];
    
    for (const child of children) {
        if (t.isJSXElement(child)) {
            transformedChildren.push(transformJSXElement(child, pragma));
        } else if (t.isJSXFragment(child)) {
            const fragment = transformJSXFragment(child, pragma, pragmaFrag);
            // Fragment is either an array (for static) or a component call (for dynamic)
            if (t.isCallExpression(fragment)) {
                // Fragment component - add as is
                // Note: fragmentImported flag should be set at the visitor level
                transformedChildren.push(fragment);
            } else if (t.isArrayExpression(fragment)) {
                // Static fragment - spread its children
                transformedChildren.push(...(fragment.elements as t.Expression[]));
            } else {
                transformedChildren.push(fragment);
            }
        } else if (t.isJSXExpressionContainer(child)) {
            if (!t.isJSXEmptyExpression(child.expression)) {
                transformedChildren.push(child.expression);
            }
        } else if (t.isJSXText(child)) {
            const text = child.value.trim();
            if (text) {
                // Use text() helper for text nodes
                transformedChildren.push(
                    t.callExpression(
                        t.identifier('text'),
                        [t.stringLiteral(text)]
                    )
                );
            }
        }
    }
    
    if (transformedChildren.length === 0) {
        return null;
    }
    
    if (transformedChildren.length === 1) {
        return transformedChildren[0];
    }
    
    return t.arrayExpression(transformedChildren);
}

function getTagName(node: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string {
    if (t.isJSXIdentifier(node)) {
        return node.name;
    }
    if (t.isJSXMemberExpression(node)) {
        return `${getTagName(node.object)}.${node.property.name}`;
    }
    if (t.isJSXNamespacedName(node)) {
        return `${node.namespace.name}:${node.name.name}`;
    }
    return '';
}

function getAttributeName(node: t.JSXIdentifier | t.JSXNamespacedName): string {
    if (t.isJSXIdentifier(node)) {
        return node.name;
    }
    if (t.isJSXNamespacedName(node)) {
        return `${node.namespace.name}:${node.name.name}`;
    }
    return '';
}

function getAttributeValue(value: t.JSXAttribute['value']): t.Expression | null {
    if (!value) return null;
    
    if (t.isJSXExpressionContainer(value)) {
        if (t.isJSXEmptyExpression(value.expression)) {
            return null;
        }
        return value.expression;
    }
    
    if (t.isStringLiteral(value)) {
        return value;
    }
    
    if (t.isJSXElement(value)) {
        // Shouldn't happen for attributes but handle it
        return transformJSXElement(value, 'h');
    }
    
    if (t.isJSXFragment(value)) {
        return transformJSXFragment(value, 'h', 'Fragment');
    }
    
    return null;
}


const FORMS_BIND_HELPERS = [
    'bindText',
    'bindSelect',
    'bindChecked',
    'bindNumber',
] as const;

// Collect the names of all called identifiers in an AST subtree (used to decide
// which directive-runtime imports to inject).
function collectCallees(node: unknown, into: Set<string>): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
        for (const item of node) collectCallees(item, into);
        return;
    }
    const n = node as t.Node;
    if (t.isCallExpression(n) && t.isIdentifier(n.callee)) {
        into.add(n.callee.name);
    }
    for (const key of Object.keys(n)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue;
        collectCallees((n as unknown as Record<string, unknown>)[key], into);
    }
}

function hasTextCall(node: t.Node): boolean {
    // Simple recursive check for text() calls
    if (t.isCallExpression(node) && t.isIdentifier(node.callee, { name: 'text' })) {
        return true;
    }
    
    if (t.isArrayExpression(node)) {
        return node.elements.some(el => el && hasTextCall(el as t.Node));
    }
    
    if (t.isObjectExpression(node)) {
        return node.properties.some(prop => {
            if (t.isObjectProperty(prop)) {
                return hasTextCall(prop.value);
            }
            return false;
        });
    }
    
    if (t.isCallExpression(node)) {
        return node.arguments.some(arg => hasTextCall(arg));
    }
    
    return false;
}

function hasFragmentCall(node: t.Node, fragmentName: string): boolean {
    // Check for Fragment usage in h() calls
    if (t.isCallExpression(node)) {
        // Check if first arg is Fragment identifier
        if (node.arguments.length > 0 && t.isIdentifier(node.arguments[0], { name: fragmentName })) {
            return true;
        }
        // Recursively check arguments
        return node.arguments.some(arg => hasFragmentCall(arg, fragmentName));
    }
    
    if (t.isArrayExpression(node)) {
        return node.elements.some(el => el && hasFragmentCall(el as t.Node, fragmentName));
    }
    
    if (t.isObjectExpression(node)) {
        return node.properties.some(prop => {
            if (t.isObjectProperty(prop)) {
                return hasFragmentCall(prop.value, fragmentName);
            }
            return false;
        });
    }
    
    return false;
}
module.exports = babelPluginExodraJsx;
module.exports.default = babelPluginExodraJsx;
