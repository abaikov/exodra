import { createRequire } from 'module';
import generate from '@babel/generator';
import type * as t from '@babel/types';
import { createExoNamedSchema } from '@exodra/core';
import type { TExoJsonDeclarations, TExoSchemaCursor } from '@exodra/core';
import {
    ExoDomBackend,
    compileExoDomSchema,
    exoDomJsonDeclaration,
    withExoCompiler,
    withExoDefaults,
    withExoForeignNamespaces,
} from '@exodra/dom';
import { compileExoStrJsonDeclaration } from '@exodra/string';

// jsdom ships no types; this is the one constructor the build-time compile calls.
type TExoJsdom = {
    readonly JSDOM: new (html: string) => { readonly window: { readonly document: Document } };
};

const load = createRequire(__filename);

let buildDocument: Document | null = null;

// The generated markup function holds string literals and cursor calls and nothing else, so it is
// run here with the compilers the page would otherwise ship.
export function compileExoJsonDeclarations(
    markup: t.ArrowFunctionExpression
): TExoJsonDeclarations {
    const build = new Function(`return (${generate(markup).code});`)() as (
        cursor: TExoSchemaCursor
    ) => void;
    const declaration = createExoNamedSchema(build);
    const scope = globalThis as { document?: Document };
    const pageDocument = scope.document;
    if (pageDocument === undefined)
        scope.document = buildDocument ??= new (load('jsdom') as TExoJsdom).JSDOM('').window
            .document;
    try {
        // The writer that declares no Text node, so the page's own writers pack decides the slot.
        const backend = withExoForeignNamespaces(
            withExoDefaults(withExoCompiler(new ExoDomBackend()))
        );
        const dom = exoDomJsonDeclaration(compileExoDomSchema(declaration, backend));
        let string: ReturnType<typeof compileExoStrJsonDeclaration> | undefined;
        // A shape only the server refuses stays a refusal at the server's own compile.
        try {
            string = compileExoStrJsonDeclaration(declaration);
        } catch {
            string = undefined;
        }
        return JSON.parse(
            JSON.stringify(string === undefined ? { dom } : { dom, string })
        ) as TExoJsonDeclarations;
    } finally {
        if (pageDocument === undefined) delete scope.document;
    }
}
