import type { TExoMachine } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

export type TExoMountSource<TParams = unknown> =
    | TExoMachine<TExoDomNode, unknown, TParams>
    | (() => TExoMachine<TExoDomNode, unknown, TParams>);
