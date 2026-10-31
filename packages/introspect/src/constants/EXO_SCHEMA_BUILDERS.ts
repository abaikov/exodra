/**
 * THE CALLS THAT BUILD A SCHEMA — one list, for the two passes that ask about them.
 *
 * `ExoIntrospectionEngine` asks over ts-morph nodes and the ESLint rules ask over ESTree, and
 * for most of this file's life each carried its own copy of the names. They had already
 * drifted by the time anyone looked: the lint rule exempted the JSX form and the engine did not,
 * so the same file reported clean in an editor and reported a performance problem on the
 * command line.
 *
 * `createExoSchema` / `createExoNamedSchema` build the shape; `createExoStatic` builds one with no
 * ports at all; `exoJsx` is the JSX form, which `@exodra/babel-plugin-schema` compiles into a
 * `createExoNamedSchema` call. All of them run ONCE per process by design, which is what makes "where is this called from" a question worth
 * asking.
 *
 * Matched by the callee's TEXT rather than by resolving the import: it costs no type
 * resolution, and it still recognises an aliased import (`createExoSchema as build`) at the cost of
 * missing it — the failure direction that reports nothing rather than reporting something
 * wrong.
 */
export const EXO_SCHEMA_BUILDERS: readonly string[] = [
    'createExoSchema',
    'createExoNamedSchema',
    'createExoStatic',
    'exoJsx',
];
