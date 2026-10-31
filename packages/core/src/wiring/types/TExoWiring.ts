import type { TExoEventHandler } from './TExoEventHandler';
import type { TExoEventPort } from '../../schema/ports/types/TExoEventPort';
import type { TExoFillDoors } from '../../schema/types/TExoFillDoors';
import type { TExoPortTable } from '../../schema/ports/types/TExoPortTable';
import type { TExoBaseNodeMethods } from './TExoBaseNodeMethods';
import type { TExoPortNodeWriter } from './TExoPortNodeWriter';

// `TEvent`/`TNode` DEFAULT TO `unknown` AND ARE PURE PASS-THROUGH: this package hands both to a
// handler and reads neither, so naming the DOM's `Event`/`Element` here would bind every backend
// to a document. A DOM-facing surface narrows them; `@exodra/term` supplies its own pair.
// DURING HYDRATION EVERY FILL REPAIRS — it compares what the server printed and writes only on
// disagreement — so watching a source buys the SUBSCRIPTION, not the first write's correctness.
export interface TExoWiring<TEvent = unknown, TNode = unknown>
    extends TExoFillDoors,
        TExoBaseNodeMethods {
    portTable(): TExoPortTable;
    portNodeWriter(): TExoPortNodeWriter;
    // THERE IS NO THIRD WRITE DOOR — a per-port writer was built and lost on the instrument. The
    // numbers are in the README, "The port-writer that was struck".
    on(port: TExoEventPort, handler: TExoEventHandler<TEvent, TNode>, subject?: unknown): void;
}
