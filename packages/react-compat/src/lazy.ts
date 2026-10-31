import { createElement } from './createElement';

export function lazy<TProps>(
    load: () => Promise<{ default: (props: TProps) => unknown }>
): (props: TProps) => unknown {
    let loaded: ((props: TProps) => unknown) | null = null;
    let failure: unknown = null;
    let promise: Promise<unknown> | null = null;
    return function Lazy(props: TProps): unknown {
        if (failure !== null) throw failure;
        if (loaded === null) {
            throw (promise ??= load().then(
                (module) => {
                    loaded = module.default;
                },
                (error: unknown) => {
                    failure = error ?? new Error('lazy() module failed to load');
                }
            ));
        }
        return createElement(loaded, props as Record<string, unknown>);
    };
}
