import type { ConfigAPI, NodePath, PluginObj } from '@babel/core';
import * as t from '@babel/types';
import { exoImports } from '../exoImports';
import { pickName } from '../pickName';
import { compileHostTree } from './compileHostTree';
import { emitRuntimeElement } from './emitRuntimeElement';
import { isCompilableHost } from './isCompilableHost';
import { mergeHostBranches } from './mergeHostBranches';
import { readCallElement } from './readCallElement';
import type { TExoFileState } from '../types/TExoFileState';
import type { TExoReactNames } from './types/TExoReactNames';
import type { TExoReactPluginOptions } from './types/TExoReactPluginOptions';

function collectBoundNames(programPath: NodePath<t.Program>): Set<string> {
    const names = new Set<string>();
    programPath.traverse({
        BindingIdentifier(p: NodePath<t.Identifier>) {
            names.add(p.node.name);
        },
    });
    return names;
}

function pickReactNames(taken: Set<string>): TExoReactNames {
    const pick = (base: string): string => {
        const name = pickName(taken, base);
        taken.add(name);
        return name;
    };
    return {
        cursor: pick('_b'),
        slot: pick('_p'),
        port: pick('_h'),
        schema: pick('_s'),
        machine: pick('_m'),
        connector: pick('_c'),
        element: pick('_e'),
        values: pick('_v'),
        last: pick('_l'),
        state: pick('_x'),
    };
}

function moduleStatement(path: NodePath): NodePath {
    let current: NodePath = path;
    while (current.parentPath !== null && !current.parentPath.isProgram()) {
        current = current.parentPath;
    }
    return current;
}

function babelPluginExodraReact(api: ConfigAPI, options: TExoReactPluginOptions): PluginObj {
    api.assertVersion(7);
    const importSource = options.importSource ?? '@exodra/react-compat';
    const schemaSource = options.schemaSource ?? '@exodra/core';
    let names: TExoReactNames;
    let file: TExoFileState;

    const factorySources = new Set([
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        importSource,
        importSource + '/jsx-runtime',
    ]);
    const runtime = (name: string): string => exoImports.use(file, importSource, name);
    const jsxRuntime = (name: string): string =>
        exoImports.use(file, importSource + '/jsx-runtime', name);

    return {
        name: '@exodra/babel-plugin-schema/react',
        visitor: {
            Program: {
                enter(path) {
                    const taken = collectBoundNames(path);
                    names = pickReactNames(taken);
                    file = { schemas: 0, compiled: false, taken, imports: new Map() };
                    path.traverse({
                        CallExpression: {
                            exit(call) {
                                const element = readCallElement(call, factorySources);
                                if (element !== null) call.replaceWith(element);
                            },
                        },
                    });
                },
                exit(path) {
                    if (!file.compiled) return;
                    path.node.body.unshift(...exoImports.declarations(file));
                },
            },
            JSXElement(path) {
                file.compiled = true;
                if (!isCompilableHost(path.node)) {
                    path.replaceWith(
                        emitRuntimeElement(path.node, jsxRuntime('jsx'), () =>
                            jsxRuntime('Fragment')
                        )
                    );
                    return;
                }
                const { hoisted, replacement } = compileHostTree(path.node, names, file.schemas++, {
                    schemaFactory: exoImports.use(file, schemaSource, 'createExoSchema'),
                    hostFactory: runtime('createExoReactHost'),
                    reconcileRegion: runtime('reconcileExoReactRegion'),
                    writeProps: runtime('writeExoReactProps'),
                    jsx: jsxRuntime('jsx'),
                    hostElement: runtime('createExoReactHostElement'),
                });
                const target = moduleStatement(path);
                path.replaceWith(replacement);
                target.insertBefore(hoisted);
            },
            ConditionalExpression(path) {
                const merged = mergeHostBranches(path.node);
                if (merged !== null) path.replaceWith(merged);
            },
            JSXFragment(path) {
                file.compiled = true;
                path.replaceWith(
                    emitRuntimeElement(path.node, jsxRuntime('jsx'), () => jsxRuntime('Fragment'))
                );
            },
        },
    };
}

export default babelPluginExodraReact;
export { babelPluginExodraReact };
