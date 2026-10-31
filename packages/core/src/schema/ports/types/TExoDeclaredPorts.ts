import type { TExoPortOfKind } from './TExoPortOfKind';

export type TExoDeclaredPorts<TDecl> = {
    readonly [K in keyof TDecl]: TExoPortOfKind<TDecl[K]>;
};
