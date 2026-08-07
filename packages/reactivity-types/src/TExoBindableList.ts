import type { TExoBindable } from './TExoBindable';
import type { TExoListOp } from './TExoListOp';

/**
 * A list is not a second interface — it is a bindable whose value is an array and
 * whose change event is a list op. Implementing `getValue` + `onChange` is enough
 * to be either one, so an adapter writes the pair once.
 *
 * Which contract applies is chosen by the SCHEMA BUCKET, not by the type: in
 * `bindables` the value may be recomputed per read and the consumer re-diffs; in
 * `bindableLists` the value is a stable array the ops describe deltas into.
 */
export type TExoBindableList<
    TItem = unknown,
    TEvent = TExoListOp<TItem>
> = TExoBindable<readonly TItem[], TEvent>;
