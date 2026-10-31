import type { TExoPort } from '../../schema/ports/types/TExoPort';
import type { TExoPortTable } from '../../schema/ports/types/TExoPortTable';

/**
 * DO NOT CROSS THE TWO: a write from one backend handed another's table reads it with the wrong
 * index meaning, and the type system cannot see it. THE FILL RECORD IS NOT MADE HERE — the initial
 * fill goes through `TExoWiring.set`, which every backend records.
 */
export type TExoPortNodeWriter = (table: TExoPortTable, port: TExoPort, value: unknown) => void;
