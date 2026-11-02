import type * as t from '@babel/types';

export type TExoMachineSource = {
    readonly name: string;
    readonly exported: boolean;
    readonly schema: string;
    readonly paramsType: t.TSType | null;
    readonly stateType: t.TSType | null;
    readonly initial: t.ArrowFunctionExpression | t.FunctionExpression | null;
    wire: t.ArrowFunctionExpression | t.FunctionExpression | null;
    readonly transitions: {
        readonly key: string;
        readonly fn: t.ArrowFunctionExpression | t.FunctionExpression;
    }[];
    readonly transitionNames: Map<string, string>;
    readonly handlers: Map<string, t.ArrowFunctionExpression | t.FunctionExpression>;
    readonly effects: (t.ArrowFunctionExpression | t.FunctionExpression)[];
};
