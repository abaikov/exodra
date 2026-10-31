import { startTransition } from './startTransition';
import { useCallback } from './useCallback';
import { useState } from './useState';

export function useTransition(): [boolean, (run: () => void) => void] {
    const [pending, setPending] = useState(false);
    const start = useCallback((run: () => void): void => {
        setPending(true);
        startTransition(() => {
            run();
            setPending(false);
        });
    }, []);
    return [pending, start];
}
