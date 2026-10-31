import { EXO_HIGH_FREQUENCY_EVENTS } from '../constants/EXO_HIGH_FREQUENCY_EVENTS';
import { EXO_NON_BUBBLING_EVENTS } from '../constants/EXO_NON_BUBBLING_EVENTS';
import { attachExoDelegatedEvent } from '../attachExoDelegatedEvent';
import { createExoEventPortData } from './createExoEventPortData';
import { exoEventSlotsFor } from '../exoEventSlotsFor';
import { installExoDelegatedRoot } from '../installExoDelegatedRoot';
import type { TExoDelegatedEventsOptions } from '../types/TExoDelegatedEventsOptions';
import type { TExoEventPortData } from '../types/TExoEventPortData';
import type { TExoEventsApi } from '../types/TExoEventsApi';
import type { TExoEventSlots } from '../types/TExoEventSlots';

// A counter and not a caller-supplied name: two packs delegating the same names are still two packs
// and must not read each other's handlers off an element.
let packs = 0;

// Which events are delegated is DECLARED up front, not discovered: the root's listeners go on when
// a render starts, before any port is filled.
// ONE PACK PER APPLICATION, at module level — not for correctness but because a pack built per
// render forces a backend built per render, which re-parses every schema it touches.
export function createExoDelegatedEvents(
    events: readonly string[],
    options?: TExoDelegatedEventsOptions
): TExoEventsApi {
    const allowHighFrequency = options !== undefined && options.allowHighFrequency === true;
    const packId = 'delegated' + ++packs;
    // Copied now, so a caller that mutates the array it passed cannot change what an already-
    // rendered page listens for, and duplicates collapse here instead of becoming two listeners.
    const slots: TExoEventSlots[] = [];
    const byName = new Map<string, TExoEventSlots>();
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (byName.has(event)) continue;
        const pair = exoEventSlotsFor(packId, event);
        slots.push(pair);
        byName.set(event, pair);
    }

    const rootKey = '__exoDelegatedRoot$' + packId;

    // Annotated, so a mismatch names this function instead of somewhere inside `compileExoDomSchema`.
    const port = (event: string): TExoEventPortData => {
        const pair = byName.get(event);
        if (pair === undefined) {
            // Row `EXO0002` in `scripts/exo-error-codes.json` → `docs-site/docs/errors.md`;
            // `@exodra/core`'s `error-code-registry.test.ts` fails if the row, the page or the
            // production payload stops matching this site.
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `exoEvents: this schema has a "${event}" port, but the delegated pack ` +
                      `only listens for [${events.join(', ')}]. Add "${event}" to ` +
                      'createExoDelegatedEvents(...), or render this schema with a pack that covers ' +
                      'it — a port nobody listens for is a button that does nothing.'
                    : `EXO0002 "${event}"`
            );
        }
        // The two name refusals are asked HERE and not at pack build, where they refused a SUPERSET
        // of the broken programs. What is given up: a dead name in a pack's list is never reported.
        if (EXO_NON_BUBBLING_EVENTS.has(event)) {
            const dead =
                `createExoDelegatedEvents: "${event}" does not bubble, so a listener on the render ` +
                'root would never see it and every handler for it would be dead';
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? dead +
                      '. Use the bubbling twin where there is one (focus/blur → focusin/focusout), ' +
                      'or leave the name out of this pack and let it keep the direct strategy.'
                    : `EXO0051 "${event}"`
            );
        }
        // Separate from the refusal above — that one is correctness, this one is cost — and tested
        // AFTER it, so a name in both lists is still reported as the dead-handler bug.
        if (!allowHighFrequency && EXO_HIGH_FREQUENCY_EVENTS.has(event)) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `createExoDelegatedEvents: "${event}" bubbles, so delegating it WORKS — this is not ` +
                      'the non-bubbling refusal. It is refused because of what it costs: the ' +
                      "root's listener runs on every one of these, and each run walks from " +
                      'e.target up to the root reading one property per ancestor, at the ' +
                      "pointer's sampling rate rather than when a person acts — for as long as " +
                      'the pointer is moving, whether or not anything on that path has a ' +
                      'handler. Under the direct strategy the same stream reaches one listener ' +
                      'on one element and stops. If a delegated ' +
                      `"${event}" is what you mean — a drag served by ONE listener on a root ` +
                      'instead of one per row — say so in the call: ' +
                      'createExoDelegatedEvents([...], { allowHighFrequency: true }). Otherwise leave ' +
                      `"${event}" out of this pack and let it keep the direct strategy.`
                    : `EXO0052 "${event}"`
            );
        }
        // No listener of its own: the root's one listener is what dispatch walks to.
        return createExoEventPortData(pair, null);
    };

    return {
        name: packId + '(' + events.join(',') + ')',
        port,
        attach: attachExoDelegatedEvent,
        install: (root: Element): (() => void) => installExoDelegatedRoot(root, rootKey, slots),
    };
}
