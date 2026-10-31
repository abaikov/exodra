import type { TExoTermMachine } from '../../instance/types/TExoTermMachine';
import { COUNTER } from '../readme-counter';
import { TODO, TODO_LIST } from '../readme-todos';

// The portability claim, asserted by the compiler. IT IS IN `src/` AND NOT IN A `.test.ts`: every
// tsconfig here excludes test files and vitest transpiles without checking types, so
// `npm run typecheck` is the only thing that checks it. The wide assertion passes by METHOD
// BIVARIANCE and would go red if `TExoTermSurface` used function-typed properties.
type TAssert<T extends true> = T;

export type TExoTermRunsTheReadmeCounter = TAssert<
    typeof COUNTER extends TExoTermMachine ? true : false
>;

export type TExoTermRunsTheReadmeTodoRow = TAssert<
    typeof TODO extends TExoTermMachine ? true : false
>;

export type TExoTermRunsTheReadmeTodoList = TAssert<
    typeof TODO_LIST extends TExoTermMachine ? true : false
>;
