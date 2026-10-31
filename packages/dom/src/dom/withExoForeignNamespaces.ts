import { composeExoPlugins } from '@exodra/core';
import { EXO_FOREIGN_NAMESPACES } from './constants/EXO_FOREIGN_NAMESPACES';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoForeignNamespaces } from './types/TExoForeignNamespaces';

export const withExoForeignNamespaces = <TBase extends TExoDomApi>(
    base: TBase
): TBase & { readonly foreignNamespaces: TExoForeignNamespaces } =>
    composeExoPlugins(base, {
        foreignNamespaces: (_next: unknown) => EXO_FOREIGN_NAMESPACES,
    }) as TBase & { readonly foreignNamespaces: TExoForeignNamespaces };
