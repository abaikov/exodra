import type { TExoNodeSchema } from './TExoNodeSchema';
import type { TExoContext } from './TExoContext';

export type TExoSchema = TExoNodeSchema<
    string | ((context: TExoContext) => TExoSchema | readonly TExoSchema[]),
    {
        static?: Record<string, unknown> & {
            children?: TExoSchema | readonly TExoSchema[] | null;
            textContent?: unknown;
        };
        bindables?: Record<string, unknown>;
        bindableLists?: Record<string, unknown>;
    }
>;
