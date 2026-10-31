/**
 * The rules that were ported from the three-props runtime to the schema core, exercised as
 * ESLint exercises them: build the visitor with `create(context)` and hand it nodes.
 *
 * The nodes are minimal ESTree shapes, not a parse, because that is what these rules read —
 * a callee name, an argument count, an argument's `type`, and the `parent` chain. Pulling in a
 * parser would test the parser.
 */

import { describe, expect, it } from 'vitest';
import { rules, configs } from '../eslint-plugin';

type TNode = Record<string, unknown>;

/** What every rule in this plugin is, as far as a test is concerned. */
type TRule = {
    create(context: unknown): Record<string, ((node: TNode) => void) | undefined>;
};

/** A context that records what was reported, and nothing else. */
function fakeContext() {
    const reported: string[] = [];
    return {
        reported,
        context: {
            report: (descriptor: { messageId: string }) => {
                reported.push(descriptor.messageId);
            },
            getSourceCode: () => ({ ast: {} as TNode, getText: () => '' }),
        },
    };
}

/** `name(...args)`, with an optional chain of ancestors above it. */
function callNode(name: string, args: TNode[] = [], ancestors: string[] = []): TNode {
    let parent: TNode | undefined;
    for (let i = ancestors.length - 1; i >= 0; i--) {
        parent = { type: ancestors[i], parent };
    }
    return {
        type: 'CallExpression',
        callee: { type: 'Identifier', name },
        arguments: args,
        parent,
    };
}

const run = (ruleName: keyof typeof rules, node: TNode): string[] => {
    const { reported, context } = fakeContext();
    const visitor = (rules[ruleName] as unknown as TRule).create(context);
    visitor.CallExpression?.(node);
    return reported;
};

describe('schema-validation (schema core)', () => {
    it('reports exoJsx() given a reference instead of a function literal', () => {
        // The Babel plugin reads the function at build time, so a reference cannot be compiled.
        expect(run('schema-validation', callNode('exoJsx', [{ type: 'Identifier' }]))).toEqual([
            'declarationNeedsFunction',
        ]);
    });

    it('accepts exoJsx(fn)', () => {
        expect(
            run('schema-validation', callNode('exoJsx', [{ type: 'ArrowFunctionExpression' }]))
        ).toEqual([]);
    });
});

describe('no-schema-in-function', () => {
    it('reports a schema built inside a function', () => {
        expect(
            run('no-schema-in-function', callNode('createExoSchema', [], ['FunctionDeclaration']))
        ).toEqual(['schemaInFunction']);
    });

    it('says nothing about a schema built at module scope', () => {
        expect(
            run('no-schema-in-function', callNode('createExoSchema', [], ['VariableDeclarator']))
        ).toEqual([]);
    });

    it('exempts exoJsx, which the Babel plugin hoists for you', () => {
        expect(
            run('no-schema-in-function', callNode('exoJsx', [], ['ArrowFunctionExpression']))
        ).toEqual([]);
    });

    it('is in both shipped configs', () => {
        expect(configs.recommended.rules['exodra/no-schema-in-function']).toBeDefined();
        expect(configs.strict.rules['exodra/no-schema-in-function']).toBeDefined();
    });
});

describe('no-inline-objects', () => {
    it('fires on an object literal inside a component declaration', () => {
        // The wiring function runs once per INSTANCE, so an object literal in it is an allocation
        // per row.
        const { reported, context } = fakeContext();
        const visitor = (rules['no-inline-objects'] as unknown as TRule).create(context);
        visitor.ObjectExpression?.({
            type: 'ObjectExpression',
            parent: {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'createExoStatic' },
            },
        });
        expect(reported).toEqual(['avoidInlineObject']);
    });
});
