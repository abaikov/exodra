/**
 * ESLint plugin for Exodra framework
 * Provides rules specific to Exodra best practices
 */

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
  key: ExoAstNode;
  id: ExoAstNode;
  body: ExoAstNode;
  arguments: ExoAstNode[];
  properties: ExoAstNode[];
  [key: string]: unknown;
}

interface ExoRuleFixer {
  insertTextAfter(node: ExoAstNode, text: string): unknown;
}

interface ExoReportDescriptor {
  node: ExoAstNode;
  messageId: string;
  fix?: (fixer: ExoRuleFixer) => unknown;
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
        description: 'Disallow inline object creation in render methods to prevent unnecessary re-renders',
        recommended: true
      },
      messages: {
        avoidInlineObject: 'Avoid creating objects inline. Move to constants or useMemo.'
      }
    },
    create(context: ExoRuleContext) {
      return {
        ObjectExpression(node: ExoAstNode) {
          // Check if we're inside a component render
          let parent = node.parent;
          while (parent) {
            if (parent.type === 'JSXExpressionContainer' || 
                (parent.type === 'CallExpression' && parent.callee.name === 'h')) {
              context.report({
                node,
                messageId: 'avoidInlineObject'
              });
              break;
            }
            parent = parent.parent;
          }
        }
      };
    }
  },

  /**
   * Rule: prefer-derived-signals
   * Suggests using derived signals instead of manual subscriptions
   */
  'prefer-derived-signals': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Prefer derived signals over manual subscriptions for computed values',
        recommended: true
      },
      messages: {
        preferDerived: 'Consider using a derived signal instead of manual subscription'
      }
    },
    create(context: ExoRuleContext) {
      return {
        CallExpression(node: ExoAstNode) {
          if (node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'subscribe' &&
              node.parent.type === 'VariableDeclarator') {
            // Check if this subscription is just computing a value
            const callback = node.arguments[0];
            if (callback && callback.type === 'ArrowFunctionExpression') {
              const body = callback.body;
              const blockStatements = body.body as unknown as ExoAstNode[];
              if (body.type === 'CallExpression' ||
                  (body.type === 'BlockStatement' &&
                   blockStatements.length === 1 &&
                   blockStatements[0].type === 'ExpressionStatement')) {
                context.report({
                  node,
                  messageId: 'preferDerived'
                });
              }
            }
          }
        }
      };
    }
  },

  /**
   * Rule: schema-validation
   * Ensures schemas have proper validation
   */
  'schema-validation': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Ensure Exodra schemas have proper type validation',
        recommended: true
      },
      messages: {
        missingValidation: 'Schema should have type validation',
        missingType: 'Schema must specify a type property'
      },
      fixable: 'code'
    },
    create(context: ExoRuleContext) {
      return {
        CallExpression(node: ExoAstNode) {
          // Check for h() or schema creation
          if (node.callee.name === 'h' || node.callee.name === 'defineSchema') {
            const [type, attrs] = node.arguments;
            
            if (!type) {
              context.report({
                node,
                messageId: 'missingType'
              });
            }
            
            // Check for validation in attrs
            if (attrs && attrs.type === 'ObjectExpression') {
              const hasValidation = attrs.properties.some((prop: ExoAstNode) =>
                prop.key && prop.key.name === 'validate'
              );
              
              if (!hasValidation && node.callee.name === 'defineSchema') {
                context.report({
                  node: attrs,
                  messageId: 'missingValidation',
                  fix(fixer: ExoRuleFixer) {
                    const lastProp = attrs.properties[attrs.properties.length - 1];
                    if (lastProp) {
                      return fixer.insertTextAfter(lastProp, ',\n  validate: true');
                    }
                  }
                });
              }
            }
          }
        }
      };
    }
  },

  /**
   * Rule: no-direct-state-mutation
   * Prevents direct state mutation in Exodra
   */
  'no-direct-state-mutation': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow direct state mutation, use setValue or list operations',
        recommended: true
      },
      messages: {
        noDirectMutation: 'Do not mutate state directly. Use setValue() or list operations.'
      }
    },
    create(context: ExoRuleContext) {
      return {
        AssignmentExpression(node: ExoAstNode) {
          // Check if we're assigning to a bindable's value
          if (node.left.type === 'MemberExpression') {
            const sourceCode = context.getSourceCode();
            const text = sourceCode.getText(node.left.object);
            
            // Simple heuristic: check if variable name suggests it's a bindable
            if (text.includes('bindable') || text.includes('state') || text.includes('signal')) {
              context.report({
                node,
                messageId: 'noDirectMutation'
              });
            }
          }
        }
      };
    }
  },

  /**
   * Rule: proper-cleanup
   * Ensures proper cleanup in components
   */
  'proper-cleanup': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Ensure proper cleanup of subscriptions and resources',
        recommended: true
      },
      messages: {
        missingCleanup: 'Subscription should be cleaned up with onDispose'
      }
    },
    create(context: ExoRuleContext) {
      const subscriptions = new Set<string>();
      const cleanups = new Set<string>();

      return {
        CallExpression(node: ExoAstNode) {
          // Track subscriptions
          if (node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'subscribe') {
            const parent = node.parent;
            if (parent.type === 'VariableDeclarator') {
              subscriptions.add(parent.id.name);
            }
          }
          
          // Track cleanups
          if (node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'onDispose') {
            const arg = node.arguments[0];
            if (arg && arg.type === 'Identifier') {
              cleanups.add(arg.name);
            }
            if (arg && arg.type === 'CallExpression' && 
                arg.callee.type === 'MemberExpression' &&
                arg.callee.property.name === 'unsubscribe') {
              cleanups.add('*'); // Mark that some cleanup exists
            }
          }
        },
        'Program:exit'() {
          // Check for unhandled subscriptions
          subscriptions.forEach(sub => {
            if (!cleanups.has(sub) && !cleanups.has('*')) {
              context.report({
                node: context.getSourceCode().ast,
                messageId: 'missingCleanup'
              });
            }
          });
        }
      };
    }
  }
};

/**
 * ESLint plugin configuration
 */
export const configs = {
  recommended: {
    plugins: ['exodra'],
    rules: {
      'exodra/no-inline-objects': 'warn',
      'exodra/prefer-derived-signals': 'warn',
      'exodra/schema-validation': 'error',
      'exodra/no-direct-state-mutation': 'error',
      'exodra/proper-cleanup': 'warn'
    }
  },
  strict: {
    plugins: ['exodra'],
    rules: {
      'exodra/no-inline-objects': 'error',
      'exodra/prefer-derived-signals': 'error',
      'exodra/schema-validation': 'error',
      'exodra/no-direct-state-mutation': 'error',
      'exodra/proper-cleanup': 'error'
    }
  }
};

/**
 * Main ESLint plugin export
 */
const plugin = {
  rules,
  configs
};

export default plugin;