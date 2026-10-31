import type * as t from '@babel/types';

export type TExoCompiledJsxDeclaration = {
    readonly hoisted: t.Statement;
    readonly replacement: t.Expression;
};
