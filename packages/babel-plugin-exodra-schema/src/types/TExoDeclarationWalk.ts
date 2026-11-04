import type * as t from '@babel/types';

export type TExoDeclarationWalk = {
    readonly cursor: string;
    readonly holder: string | null;
    readonly portNames: Set<string>;
    readonly readModuleConstantString: (expression: t.Node) => string | null;
    readonly readModuleValue: (expression: t.Node) => t.Expression | null;
    readsModuleValue: boolean;
};
