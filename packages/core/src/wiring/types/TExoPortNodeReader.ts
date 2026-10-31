import type { TExoRefPort } from '../../schema/ports/types/TExoRefPort';
import type { TExoPortTable } from '../../schema/ports/types/TExoPortTable';

/**
 * THE TABLE IS AN ARGUMENT BECAUSE THE ACCESS CONTROL *IS* THE ARGUMENT: a derivation is handed
 * VALUES, so it has nothing to pass here. A REF PORT and not any port — on @exodra/dom a text
 * port's slot may hold the element's TEXT NODE instead.
 */
export type TExoPortNodeReader<TNode> = (table: TExoPortTable, port: TExoRefPort) => TNode;
