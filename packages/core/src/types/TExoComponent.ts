import type { TExoContext } from './TExoContext';
import type { TExoNodeSchema } from './TExoNodeSchema';

export type TExoComponent<
    TSchema extends TExoNodeSchema = TExoNodeSchema,
    TResult extends TExoNodeSchema = TExoNodeSchema
> = (context: TExoContext<TSchema>) => TResult | readonly TResult[];
