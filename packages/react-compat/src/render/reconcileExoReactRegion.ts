import { EXO_REACT_RECONCILER } from './EXO_REACT_RECONCILER';
import { placeExoReactRange } from './placeExoReactRange';
import type { TExoReactRange } from '../types/TExoReactRange';

export function reconcileExoReactRegion(range: TExoReactRange, value: unknown): void {
    const kind = typeof value;
    if ((kind === 'string' || kind === 'number') && range.slots.length === 0) {
        EXO_REACT_RECONCILER.mountText(
            range,
            kind === 'string' ? (value as string) : String(value)
        );
        return;
    }
    if ((kind === 'string' || kind === 'number') && range.slots.length === 1) {
        const only = range.slots[0];
        if (only.kind === 'text' && only.key === '.0') {
            const text = only.text as Text;
            const data = kind === 'string' ? (value as string) : String(value);
            if (text.data !== data) text.data = data;
            return;
        }
    }
    EXO_REACT_RECONCILER.updateRange(range, value);
    placeExoReactRange(range);
}
