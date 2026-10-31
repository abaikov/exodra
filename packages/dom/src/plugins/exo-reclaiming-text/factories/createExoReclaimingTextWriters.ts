import type { TExoWritersApi } from '../../../backend/types/TExoWritersApi';
import { exoReclaimingText } from '../constants/exoReclaimingText';

// Replaces `text` and delegates the other members to whatever it was composed over, so the
// composition order loses nothing either way. Which node the compiler hands a text writer travels
// with the writer (`TExoDomSetter.takesTextNode`), so handing back a function is the whole of it.
export function createExoReclaimingTextWriters(next: TExoWritersApi): TExoWritersApi {
    return {
        name: 'exo-reclaiming-text over ' + next.name,
        // Delegated as CALLS, so a pack that reaches for `this` keeps working under this one.
        attr: (name, proto, kind, at) => next.attr(name, proto, kind, at),
        markupCarries: (name, proto) => next.markupCarries(name, proto),
        text: () => exoReclaimingText,
    };
}
