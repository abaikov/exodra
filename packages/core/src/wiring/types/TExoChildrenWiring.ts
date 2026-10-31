import type { TExoMachine } from '../../machine/types/TExoMachine';
import type { TExoWiring } from './TExoWiring';
import type { TExoNode } from '../../schema/types/TExoNode';
import type { TExoChildrenPort } from '../../schema/ports/types/TExoChildrenPort';

// An `interface` because the component-taking calls name `this`, which a type alias answers TS2526
// to and then degrades to `any`, after which every parameter accepts everything with no diagnostic.
export interface TExoChildrenWiring<TEvent = unknown, TNode = unknown>
    extends TExoWiring<TEvent, TNode> {
    build<TParams>(
        machine: TExoMachine<this, unknown, TParams>,
        index?: number,
        params?: TParams
    ): TExoNode;
    one<TParams>(
        port: TExoChildrenPort,
        machine: TExoMachine<this, unknown, TParams>,
        params?: TParams
    ): void;
    list(port: TExoChildrenPort, machine: TExoMachine<this>, count: number): void;
}
