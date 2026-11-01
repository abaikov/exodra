import type { TExoTermMachine } from '../../instance/types/TExoTermMachine';
import { Counter } from '../readme-counter';
import { Todo, TodoList } from '../readme-todos';

// The portability claim, asserted by the compiler. IT IS IN `src/` AND NOT IN A `.test.ts`: every
// tsconfig here excludes test files and vitest transpiles without checking types, so
// `npm run typecheck` is the only thing that checks it. The wide assertion passes by METHOD
// BIVARIANCE and would go red if `TExoTermSurface` used function-typed properties.
type TAssert<T extends true> = T;

export type TExoTermRunsTheReadmeCounter = TAssert<
    typeof Counter extends TExoTermMachine ? true : false
>;

export type TExoTermRunsTheReadmeTodoRow = TAssert<
    typeof Todo extends TExoTermMachine ? true : false
>;

export type TExoTermRunsTheReadmeTodoList = TAssert<
    typeof TodoList extends TExoTermMachine ? true : false
>;
