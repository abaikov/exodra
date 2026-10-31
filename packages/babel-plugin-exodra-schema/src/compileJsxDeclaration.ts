import * as t from '@babel/types';
import { emitDeclaredElement } from './emitDeclaredElement';
import { exoImports } from './exoImports';
import type { TExoCompiledJsxDeclaration } from './types/TExoCompiledJsxDeclaration';
import type { TExoFileState } from './types/TExoFileState';
import type { TExoGeneratedNames } from './types/TExoGeneratedNames';
import type { TExoSchemaProducer } from './types/TExoSchemaProducer';

function readDeclarationRoot(
    fn: t.ArrowFunctionExpression | t.FunctionExpression,
    marker: string
): t.JSXElement {
    if (t.isJSXElement(fn.body)) return fn.body;
    if (t.isBlockStatement(fn.body) && fn.body.body.length === 1) {
        const only = fn.body.body[0];
        if (
            t.isReturnStatement(only) &&
            only.argument !== null &&
            only.argument !== undefined &&
            t.isJSXElement(only.argument)
        ) {
            return only.argument;
        }
    }
    throw new Error(
        `Exodra JSX: ${marker}(($) => <div …/>) returns ONE element and does nothing else. A ` +
            'declaration is built once when the module loads, so there is no per-instance work ' +
            'to put before the return: that belongs to the machine.'
    );
}

function readHolder(
    fn: t.ArrowFunctionExpression | t.FunctionExpression,
    marker: string
): string | null {
    if (fn.params.length === 0) return null;
    const param = fn.params[0];
    if (fn.params.length > 1 || !t.isIdentifier(param)) {
        throw new Error(
            `Exodra JSX: ${marker}(fn) takes ONE plain parameter, the port names: ($) => …, and ` +
                'every port is named off it where it stands — {$.title}, onClick={$.toggle}.'
        );
    }
    return param.name;
}

export function compileJsxDeclaration(
    call: t.CallExpression,
    marker: string,
    names: TExoGeneratedNames,
    file: TExoFileState,
    producer: TExoSchemaProducer
): TExoCompiledJsxDeclaration {
    const fn = call.arguments[0];
    if (
        call.arguments.length !== 1 ||
        (!t.isArrowFunctionExpression(fn) && !t.isFunctionExpression(fn))
    ) {
        throw new Error(
            `Exodra JSX: ${marker}() takes exactly one function literal — it is read at build ` +
                'time, so it cannot be a reference to one declared elsewhere.'
        );
    }
    const root = readDeclarationRoot(fn, marker);
    const schemaFactory = exoImports.use(file, producer.schemaSource, producer.schemaImport);
    const rootCursor = `${names.cursor}0`;
    const rootStatement = emitDeclaredElement(root, rootCursor, 1, {
        cursor: names.cursor,
        holder: readHolder(fn, marker),
        portNames: new Set(),
    });
    const schemaName = `${names.schema}${file.schemas++}`;
    file.compiled = true;
    return {
        hoisted: t.variableDeclaration('const', [
            t.variableDeclarator(
                t.identifier(schemaName),
                t.callExpression(t.identifier(schemaFactory), [
                    t.arrowFunctionExpression(
                        [t.identifier(rootCursor)],
                        t.blockStatement([rootStatement])
                    ),
                ])
            ),
        ]),
        replacement: t.identifier(schemaName),
    };
}
