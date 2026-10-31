import * as t from '@babel/types';
import { pickName } from './pickName';
import type { TExoFileState } from './types/TExoFileState';

/**
 * THE IMPORTS THIS COMPILER ADDS TO A FILE, resolved once per name and emitted once per module.
 *
 * The schema factory and the two shared empties a compiled machine carries. Asked for twice, a
 * name is handed back unchanged. Locals are reserved in the file's own `taken` set, so an
 * author's own binding of the same name is kept.
 */
export const exoImports = {
    /** The local name standing for `imported` from `source` in this file. */
    use(file: TExoFileState, source: string, imported: string): string {
        let fromSource = file.imports.get(source);
        if (fromSource === undefined) {
            fromSource = new Map<string, string>();
            file.imports.set(source, fromSource);
        }
        const existing = fromSource.get(imported);
        if (existing !== undefined) return existing;
        const local = pickName(file.taken, imported);
        file.taken.add(local);
        fromSource.set(imported, local);
        return local;
    },

    declarations(file: TExoFileState): t.ImportDeclaration[] {
        const out: t.ImportDeclaration[] = [];
        for (const [source, locals] of file.imports) {
            const specifiers: t.ImportSpecifier[] = [];
            for (const [imported, local] of locals) {
                specifiers.push(t.importSpecifier(t.identifier(local), t.identifier(imported)));
            }
            out.push(t.importDeclaration(specifiers, t.stringLiteral(source)));
        }
        return out;
    },
};
