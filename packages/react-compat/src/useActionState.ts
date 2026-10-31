import { useCallback } from './useCallback';
import { useRef } from './useRef';
import { useState } from './useState';

export function useActionState<TState, TPayload>(
    action: (state: TState, payload: TPayload) => TState | Promise<TState>,
    initialState: TState
): [TState, (payload: TPayload) => void, boolean] {
    const [state, setState] = useState(initialState);
    const [pending, setPending] = useState(false);
    const latest = useRef({ state, action });
    latest.current = { state, action };
    const dispatch = useCallback((payload: TPayload): void => {
        const result = latest.current.action(latest.current.state, payload);
        if (result !== null && typeof result === 'object' && 'then' in result) {
            setPending(true);
            void (result as Promise<TState>).then(
                (next) => {
                    setState(() => next);
                    setPending(false);
                },
                () => setPending(false)
            );
            return;
        }
        setState(() => result as TState);
    }, []);
    return [state, dispatch, pending];
}
