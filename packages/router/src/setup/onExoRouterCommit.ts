import { EXO_ROUTER_OUTLETS } from './constants/EXO_ROUTER_OUTLETS';
import type { TExoRouter } from '../types';

export function onExoRouterCommit(router: TExoRouter, update: () => void): () => void {
    const outlets = EXO_ROUTER_OUTLETS.get(router);
    if (outlets === undefined) return router.onChange(update);
    outlets.add(update);
    return () => {
        outlets.delete(update);
    };
}
