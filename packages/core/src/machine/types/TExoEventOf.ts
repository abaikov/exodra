import type { TExoWiring } from '../../wiring/types/TExoWiring';

export type TExoEventOf<TNode> = TNode extends TExoWiring<infer TEvent, unknown> ? TEvent : unknown;
