import type { TExoEventHandler } from '@exodra/core';
import type { TExoEventPortData } from './TExoEventPortData';

/** How a pack puts one handler on one element. FIXED per pack rather than built per port, so the
 * one call site in `on` sees one body per pack in the process instead of one per event name. */
export type TExoEventAttacher = (
    node: Element,
    data: TExoEventPortData,
    handler: TExoEventHandler<Event, Element>,
    subject: unknown
) => void;
