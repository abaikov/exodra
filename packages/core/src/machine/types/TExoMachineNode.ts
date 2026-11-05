import type { TExoEventPort } from '../../schema/ports/types/TExoEventPort';
import type { TExoEventHandler } from '../../wiring/types/TExoEventHandler';
import type { TExoFillDoors } from '../../schema/types/TExoFillDoors';
import type { TExoBaseNodeFields } from '../../wiring/types/TExoBaseNodeFields';
import type { TExoBaseNodeMethods } from '../../wiring/types/TExoBaseNodeMethods';

// `TEvent`/`TNode` CARRY THROUGH FROM THE EXONODE, so `TExoEventOf` can read them back off a
// machine's exonode and a handler is typed by the backend rather than by a cast.
export interface TExoMachineNode<TEvent = unknown, TNode = unknown>
    extends TExoFillDoors,
        TExoBaseNodeMethods,
        Pick<
            TExoBaseNodeFields,
            'state' | 'effectStops' | 'transitionOverrides' | 'serviceState' | 'machine'
        > {
    /**
     * ONE function for the whole component; the SUBJECT is the exonode, and a backend that dropped
     * it would run every row's handler against `undefined`.
     */
    on(port: TExoEventPort, handler: TExoEventHandler<TEvent, TNode>, subject?: unknown): void;
}
