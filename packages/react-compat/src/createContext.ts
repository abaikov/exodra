import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import type { TExoReactContext } from './types/TExoReactContext';

export function createContext<TValue>(defaultValue: TValue): TExoReactContext<TValue> {
    const context = {
        $$typeof: EXO_REACT_SYMBOLS.context,
        defaultValue,
    } as { $$typeof: symbol; defaultValue: TValue } & Record<string, unknown>;
    context.Provider = { $$typeof: EXO_REACT_SYMBOLS.provider, context };
    context.Consumer = { $$typeof: EXO_REACT_SYMBOLS.consumer, context };
    return context as unknown as TExoReactContext<TValue>;
}
