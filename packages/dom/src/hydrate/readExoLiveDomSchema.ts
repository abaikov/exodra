import type { TExoDomSchema } from '../dom/types/TExoDomSchema';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';

export function readExoLiveDomSchema(held: TExoHydrateSchema | TExoDomSchema): TExoDomSchema {
    return 'domSchema' in held ? held.domSchema : held;
}
