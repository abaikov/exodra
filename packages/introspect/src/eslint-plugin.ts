/**
 * ESLint plugin for Exodra framework
 * Provides rules specific to Exodra best practices
 */

import { EXO_HOISTED_BUILDERS } from './constants/EXO_HOISTED_BUILDERS.js';
import { EXO_SCHEMA_BUILDERS } from './constants/EXO_SCHEMA_BUILDERS.js';

/**
 * Minimal AST node shape shared by every ESTree node this plugin inspects.
 * The plugin only ever reads a handful of properties, so this loose-but-typed
 * model avoids taking a hard dependency on ESLint's own type packages.
 */
interface ExoAstNode {
    type: string;
    parent: ExoAstNode;
    name: string;
    callee: ExoAstNode;
    property: ExoAstNode;
    object: ExoAstNode;
    left: ExoAstNode;
    id: ExoAstNode;
    body: ExoAstNode;
    arguments: ExoAstNode[];
    [key: string]: unknown;
}

interface ExoReportDescriptor {
    node: ExoAstNode;
    messageId: string;
}

interface ExoSourceCode {
    ast: ExoAstNode;
    getText(node?: ExoAstNode): string;
}

interface ExoRuleContext {
    report(descriptor: ExoReportDescriptor): void;
    getSourceCode(): ExoSourceCode;
}

export const rules = {
    /**
     * Rule: no-inline-objects
     * Prevents inline object creation in render methods
     */
    'no-inline-objects': {
        meta: {
            type: 'suggestion',
            docs: {
                description:
                    'Disallow inline object creation in render methods to prevent unnecessary re-renders',
                recommended: true,
            },
            messages: {
                avoidInlineObject:
                    'Avoid creating objects inline. Move the object to a module-level constant.',
            },
        },
        create(context: ExoRuleContext) {
            return {
                ObjectExpression(node: ExoAstNode) {
                    // Check if we're inside a component render — or, in the schema core, inside the
                    // call that builds a component, whose wiring function runs once per INSTANCE.
                    let parent = node.parent;
                    while (parent) {
                        if (
                            parent.type === 'JSXExpressionContainer' ||
                            (parent.type === 'CallExpression' &&
                                EXO_SCHEMA_BUILDERS.includes(parent.callee.name))
                        ) {
                            context.report({
                                node,
                                messageId: 'avoidInlineObject',
                            });
                            break;
                        }
                        parent = parent.parent;
                    }
                },
            };
        },
    },

    'schema-validation': {
        meta: {
            type: 'problem',
            docs: {
                description: 'Ensure Exodra schema declarations are complete',
                recommended: true,
            },
            messages: {
                declarationNeedsFunction:
                    'exoJsx() takes one function literal, read at build time — a reference to a ' +
                    'function declared elsewhere cannot be compiled.',
            },
        },
        create(context: ExoRuleContext) {
            return {
                CallExpression(node: ExoAstNode) {
                    if (node.callee.name === 'exoJsx') {
                        const [fn] = node.arguments;
                        if (
                            !fn ||
                            (fn.type !== 'ArrowFunctionExpression' &&
                                fn.type !== 'FunctionExpression')
                        ) {
                            context.report({ node, messageId: 'declarationNeedsFunction' });
                        }
                    }
                },
            };
        },
    },

    /**
     * Rule: no-schema-in-function
     *
     * A schema is built ONCE per process, and both backends index their prepared schemas by the
     * port numbers `createExoSchema` assigned when it was closed. Building one inside a function does
     * not make the program slower, it makes it a DIFFERENT program: a new declaration per call, a
     * new schema compiled per call, and the declaration's markup parsed again each time.
     *
     * `exoJsx` is hoisted to module scope by `@exodra/babel-plugin-schema` for exactly
     * this reason, so a hand-written `createExoSchema(...)` is where the mistake is still available.
     * This is the same fact `ExoIntrospectionEngine` reports as `schema-built-per-call`; the rule
     * exists because an editor is where it can be seen while it is being written.
     */
    'no-schema-in-function': {
        meta: {
            type: 'suggestion',
            docs: {
                description:
                    'Build schemas at module scope — a schema built per call is a different program',
                recommended: true,
            },
            messages: {
                schemaInFunction:
                    'Unless this function itself runs once at module load, this schema is built again ' +
                    'on every call, with new port numbers and a freshly compiled schema. Move it ' +
                    'to module scope, or write the declaration as exoJsx and let the Babel plugin hoist it.',
            },
        },
        create(context: ExoRuleContext) {
            return {
                CallExpression(node: ExoAstNode) {
                    if (!EXO_SCHEMA_BUILDERS.includes(node.callee.name)) return;
                    // `exoJsx` is the one form a compiler hoists for you, so it is exempt.
                    if (EXO_HOISTED_BUILDERS.includes(node.callee.name)) return;

                    // THE WALK IS NOT SHARED WITH `ExoIntrospectionEngine.analyzeSchema`, which reports the
                    // same fact: that one walks ts-morph ancestors and matches `SyntaxKind`, this one
                    // follows ESTree `parent` links and matches `type` strings. The engine's list has a
                    // fourth entry, `MethodDeclaration`, which has no ESTree counterpart — here a class
                    // method's body IS a `FunctionExpression`, so these three cover the same ground.
                    // The BUILDER NAMES are shared (`constants/EXO_SCHEMA_BUILDERS`); the walks cannot be.
                    let parent = node.parent;
                    while (parent) {
                        if (
                            parent.type === 'FunctionDeclaration' ||
                            parent.type === 'FunctionExpression' ||
                            parent.type === 'ArrowFunctionExpression'
                        ) {
                            context.report({ node, messageId: 'schemaInFunction' });
                            return;
                        }
                        parent = parent.parent;
                    }
                },
            };
        },
    },
};

/**
 * ESLint plugin configuration
 */
export const configs = {
    recommended: {
        plugins: ['exodra'],
        rules: {
            'exodra/no-inline-objects': 'warn',
            'exodra/schema-validation': 'error',
            'exodra/no-schema-in-function': 'warn',
        },
    },
    strict: {
        plugins: ['exodra'],
        rules: {
            'exodra/no-inline-objects': 'error',
            'exodra/schema-validation': 'error',
            'exodra/no-schema-in-function': 'error',
        },
    },
};

/**
 * Main ESLint plugin export
 */
const plugin = {
    rules,
    configs,
};

export default plugin;
