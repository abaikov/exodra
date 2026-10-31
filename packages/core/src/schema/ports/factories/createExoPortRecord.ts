import type { TExoAnyPort } from '../types/TExoAnyPort';

export function createExoPortRecord(): Record<string, TExoAnyPort> {
    return Object.create(null) as Record<string, TExoAnyPort>;
}
