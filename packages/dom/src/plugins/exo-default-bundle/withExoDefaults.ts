import { withExoReclaimingText } from '../exo-reclaiming-text/withExoReclaimingText';

// The safety layer, as a bundle spread into a backend. It is out here and not in the core because
// every safety net is paid for per write by every page, including the pages that cannot need it. One
// plugin today: the reclaiming text writer.
export const withExoDefaults = <TBase extends object>(base: TBase): TBase =>
    withExoReclaimingText(base);
