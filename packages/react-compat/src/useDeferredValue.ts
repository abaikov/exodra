import { startTransition } from './startTransition';
import { useEffect } from './useEffect';
import { useState } from './useState';

export function useDeferredValue<TValue>(value: TValue, initialValue?: TValue): TValue {
    const [shown, setShown] = useState<TValue>(() =>
        initialValue === undefined ? value : initialValue
    );
    useEffect(() => {
        if (Object.is(shown, value)) return;
        startTransition(() => setShown(() => value));
    }, [value, shown]);
    return shown;
}
