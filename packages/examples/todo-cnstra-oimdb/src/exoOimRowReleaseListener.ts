import type { IOIMSlotReleaseListener } from '@oimdb/core';
import { EXO_OIM_PARKED_BY_OWNER } from './constants/EXO_OIM_PARKED_BY_OWNER';
import type { TExoOimParkedRow } from './types/TExoOimParkedRow';

export function exoOimRowReleaseListener(cell: number): IOIMSlotReleaseListener {
    return {
        onSlotReleased(slot) {
            const data = slot.data;
            const parked = data?.[cell] as TExoOimParkedRow | undefined;
            if (data === undefined || parked === undefined) return;
            data[cell] = undefined;
            EXO_OIM_PARKED_BY_OWNER.get(parked.owner)?.delete(slot);
            parked.node.unmount();
        },
    };
}
