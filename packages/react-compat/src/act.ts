import { EXO_REACT_RENDER } from './constants/EXO_REACT_RENDER';
import { flushExoReactUpdates } from './render/flushExoReactUpdates';

const SETTLE_TURNS_LIMIT = 100;

async function settle(): Promise<void> {
    const render = EXO_REACT_RENDER;
    for (let turn = 0; turn < SETTLE_TURNS_LIMIT; turn++) {
        flushExoReactUpdates(true);
        await Promise.resolve();
        await Promise.resolve();
        if (!render.scheduled && render.dirty.length === 0 && render.passiveEffects.length === 0) {
            return;
        }
    }
}

export function act(run: () => unknown): Promise<void> {
    let result: unknown;
    try {
        result = run();
        flushExoReactUpdates(true);
    } catch (error) {
        return Promise.reject(error);
    }
    if (result !== null && typeof result === 'object' && 'then' in result) {
        return Promise.resolve(result as PromiseLike<unknown>).then(settle);
    }
    return settle();
}
