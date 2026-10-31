import { scheduleExoReactUpdate } from './render/scheduleExoReactUpdate';
import type { TExoReactClassState } from './types/TExoReactClassState';

export class ExoReactComponent<TProps = Record<string, unknown>, TState = Record<string, unknown>> {
    static readonly isReactComponent = true;
    props: TProps;
    state: TState;
    context: unknown;
    refs: Record<string, unknown> = {};
    exoReact: TExoReactClassState = {
        slot: null,
        pending: [],
        callbacks: [],
        forced: false,
        mounted: false,
    };

    constructor(props: TProps, context?: unknown) {
        this.props = props;
        this.context = context;
        this.state = undefined as unknown as TState;
    }

    setState(
        partial:
            | Partial<TState>
            | ((state: TState, props: TProps) => Partial<TState> | null)
            | null,
        callback?: () => void
    ): void {
        const own = this.exoReact;
        own.pending.push(partial);
        if (callback !== undefined) own.callbacks.push(callback);
        if (own.slot !== null) scheduleExoReactUpdate(own.slot);
    }

    forceUpdate(callback?: () => void): void {
        const own = this.exoReact;
        own.forced = true;
        if (callback !== undefined) own.callbacks.push(callback);
        if (own.slot !== null) scheduleExoReactUpdate(own.slot);
    }

    render(): unknown {
        return null;
    }
}
