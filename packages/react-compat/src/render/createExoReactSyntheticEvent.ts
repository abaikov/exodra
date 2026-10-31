const SYNTHETIC = Symbol.for('exodra.react.synthetic');

type TExoReactSyntheticState = {
    readonly nativeEvent: Event;
    readonly currentTarget: EventTarget | null;
    propagationStopped: boolean;
};

const OWN: Readonly<Record<string, (state: TExoReactSyntheticState) => unknown>> = {
    nativeEvent: (state) => state.nativeEvent,
    currentTarget: (state) => state.currentTarget,
    isDefaultPrevented: (state) => () => state.nativeEvent.defaultPrevented,
    isPropagationStopped: (state) => () => state.propagationStopped,
    persist: () => () => undefined,
    isPersistent: () => () => true,
    stopPropagation: (state) => () => {
        state.propagationStopped = true;
        state.nativeEvent.stopPropagation();
    },
    preventDefault: (state) => () => {
        state.nativeEvent.preventDefault();
    },
};

const TRAPS: ProxyHandler<TExoReactSyntheticState> = {
    get(state, name) {
        if (name === SYNTHETIC) return true;
        if (typeof name === 'string') {
            const own = OWN[name];
            if (own !== undefined) return own(state);
        }
        const value = Reflect.get(state.nativeEvent, name, state.nativeEvent);
        return typeof value === 'function' ? value.bind(state.nativeEvent) : value;
    },
    has(state, name) {
        return (typeof name === 'string' && name in OWN) || name in state.nativeEvent;
    },
};

export function createExoReactSyntheticEvent(
    nativeEvent: Event,
    currentTarget: EventTarget | null
): Event {
    return new Proxy<TExoReactSyntheticState>(
        { nativeEvent, currentTarget, propagationStopped: false },
        TRAPS
    ) as unknown as Event;
}
