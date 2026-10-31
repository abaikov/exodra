import type { TExoMachine } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import type { TExoReactHostTemplateNode } from './TExoReactHostTemplateNode';

export type TExoReactHostTemplate = {
    readonly machine: TExoMachine<TExoDomNode>;
    readonly node: TExoReactHostTemplateNode;
};
