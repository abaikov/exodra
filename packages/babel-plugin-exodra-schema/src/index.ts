import type { ConfigAPI, NodePath, PluginObj } from '@babel/core';
import * as t from '@babel/types';
import { compileJsxDeclaration } from './compileJsxDeclaration';
import { exoImports } from './exoImports';
import { pickName } from './pickName';
import type { TExoFileState } from './types/TExoFileState';
import type { TExoGeneratedNames } from './types/TExoGeneratedNames';
import type { TExoSchemaPluginOptions } from './types/TExoSchemaPluginOptions';
import type { TExoSchemaProducer } from './types/TExoSchemaProducer';

// Program-scope `hasBinding` cannot see a function-local shadow of a generated name.
function collectBoundNames(programPath: NodePath<t.Program>): Set<string> {
    const names = new Set<string>();
    programPath.traverse({
        BindingIdentifier(p: NodePath<t.Identifier>) {
            names.add(p.node.name);
        },
    });
    return names;
}

function pickGeneratedNames(taken: Set<string>): TExoGeneratedNames {
    const names: TExoGeneratedNames = {
        cursor: pickName(taken, '_b'),
        schema: pickName(taken, '_s'),
    };
    taken.add(names.cursor);
    taken.add(names.schema);
    return names;
}

function moduleStatement(path: NodePath, marker: string): NodePath {
    let current: NodePath | null = path;
    while (current !== null && current.parentPath !== null && !current.parentPath.isProgram()) {
        current = current.parentPath;
    }
    if (current === null || current.parentPath === null) {
        throw new Error(
            `Exodra JSX: ${marker}() has no module-level statement to hoist its schema in front of.`
        );
    }
    return current;
}

function babelPluginExodraSchema(api: ConfigAPI, options: TExoSchemaPluginOptions): PluginObj {
    api.assertVersion(7);

    const producer: TExoSchemaProducer = {
        schemaSource: options.schemaSource ?? '@exodra/core',
        schemaImport: options.schemaImport ?? 'createExoNamedSchema',
    };
    const markerName = options.markerName ?? 'exoJsx';

    let names: TExoGeneratedNames;
    let file: TExoFileState;
    let markers: Set<string>;

    return {
        name: '@exodra/babel-plugin-schema',
        visitor: {
            Program: {
                enter(path) {
                    const taken = collectBoundNames(path);
                    names = pickGeneratedNames(taken);
                    file = { schemas: 0, compiled: false, taken, imports: new Map() };
                    markers = new Set([markerName]);
                    for (const stmt of path.node.body) {
                        if (!t.isImportDeclaration(stmt)) continue;
                        for (const spec of stmt.specifiers) {
                            if (!t.isImportSpecifier(spec)) continue;
                            const imported = t.isIdentifier(spec.imported)
                                ? spec.imported.name
                                : spec.imported.value;
                            if (imported === markerName) markers.add(spec.local.name);
                        }
                    }
                },
                exit(path) {
                    if (!file.compiled) return;
                    path.scope.crawl();
                    path.node.body = path.node.body.filter((stmt) => {
                        if (!t.isImportDeclaration(stmt)) return true;
                        const before = stmt.specifiers.length;
                        stmt.specifiers = stmt.specifiers.filter(
                            (spec) =>
                                !markers.has(spec.local.name) ||
                                path.scope.getBinding(spec.local.name)?.referenced === true
                        );
                        return before === 0 || stmt.specifiers.length > 0;
                    });
                    path.node.body.unshift(...exoImports.declarations(file));
                },
            },

            CallExpression(path) {
                const callee = path.node.callee;
                if (!t.isIdentifier(callee) || !markers.has(callee.name)) return;
                const { hoisted, replacement } = compileJsxDeclaration(
                    path.node,
                    callee.name,
                    names,
                    file,
                    producer
                );
                const target = moduleStatement(path, callee.name);
                path.replaceWith(replacement);
                target.insertBefore(hoisted);
            },

            JSXElement() {
                throw new Error(
                    `Exodra JSX: JSX outside ${markerName}() cannot be compiled — JSX here is a ` +
                        'schema declaration, built once per module. Wrap it: ' +
                        `${markerName}(($) => <li …/>).`
                );
            },
            JSXFragment() {
                throw new Error(
                    'Exodra JSX: a fragment cannot be compiled — a declaration is one element.'
                );
            },
        },
    };
}

export default babelPluginExodraSchema;
export { babelPluginExodraSchema };
