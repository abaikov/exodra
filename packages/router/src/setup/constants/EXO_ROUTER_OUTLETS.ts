import type { TExoRouter } from '../../types';

export const EXO_ROUTER_OUTLETS = new WeakMap<TExoRouter, Set<() => void>>();
