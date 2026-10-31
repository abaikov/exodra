import { createContext } from '../createContext';

export const EXO_REACT_SUSPENSE = createContext<((pending: Promise<unknown>) => void) | null>(null);
