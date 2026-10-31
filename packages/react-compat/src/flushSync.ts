import { flushExoReactUpdates } from './render/flushExoReactUpdates';

export function flushSync<TResult>(run: () => TResult): TResult {
    const result = run();
    flushExoReactUpdates(true);
    return result;
}
