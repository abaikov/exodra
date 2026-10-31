import type * as t from '@babel/types';

export type TExoRewriteContext = {
    readonly portOf: (node: t.Node) => string | null;
    readonly setterOf: (port: string) => string;
    readonly handlerSetterOf: (port: string) => string;
    readonly stateRef: string;
    readonly teardownsRef: string;
    readonly transitions: ReadonlySet<string>;
    readonly unsupported: string[];
    readonly runtime: Set<string>;
};
