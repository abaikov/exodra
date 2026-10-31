import type * as t from '@babel/types';
import type { TExoPortSource } from './TExoPortSource';

export type TExoMachineSource = {
    readonly builder: string;
    readonly schema: string;
    readonly paramsType: t.TSType | null;
    readonly stateType: t.TSType | null;
    initial: t.ArrowFunctionExpression | t.FunctionExpression | null;
    wire: t.ArrowFunctionExpression | t.FunctionExpression | null;
    readonly transitions: {
        readonly name: string;
        readonly fn: t.ArrowFunctionExpression | t.FunctionExpression;
    }[];
    readonly handlers: Map<string, t.ArrowFunctionExpression | t.FunctionExpression>;
    readonly effects: (t.ArrowFunctionExpression | t.FunctionExpression)[];
    done: { readonly name: string; readonly exported: boolean } | null;
    readonly ports: ReadonlyMap<string, TExoPortSource>;
};
