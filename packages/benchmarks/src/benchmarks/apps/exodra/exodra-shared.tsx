// WHAT GOES INTO A REGION — the two leaf components of Exodra's todo app, declared once so that no
// row re-compiles an identical shape. The prose is in `exodra-shared.md`.
//
// BOTH ARE MACHINES, WITH NO SUBSCRIPTION ANYWHERE: the text is a TRANSITION ARGUMENT, and whoever
// changed the data fires it. What that costs the application is the walk in `exodra.tsx`'s
// `advance`, and showing that cost is the point of the row.
import type { TExoTransitionOverrides } from '@exodra/core';
import { createExoMachineBuilder, type TExoChildrenPort, type TExoNode } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import type { TExoChildrenWiring, TExoTextPort } from '@exodra/core';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';

import { createExoSchema } from '@exodra/core';
import type { TExoMachineInitialState } from '@exodra/core';

/**
 * WHAT THE EXODRA APP'S PARENT MACHINES DEMAND OF AN EXONODE — children, plus the region door a
 * child list is opened through. IT IS NOT A BACKEND, and that is deliberate.
 *
 * NOT `TExoWire<TExoDomNode>`: that would pin every component below to the browser, and
 * `tsconfig.typecheck.json`'s header records exactly that as a defect a person found months after
 * it landed. `hydrate-floor` renders these very components through `@exodra/dom` AND
 * `@exodra/string`, and both answer every call named here — `childList` included.
 *
 * AN `interface` AND NOT AN ALIAS: `TExoChildrenWiring` names `this`, and `this` is legal only in an
 * interface or a class — as an alias TypeScript answers TS2526 and then accepts everything.
 */
export interface TExoRegionWiring extends TExoChildrenWiring {
    childList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode>;
    /** WHAT A MACHINE CHILD DEMANDS OF THE NODE THAT PLACES IT: `TAG` and `DETAILS` are machines, and
     *  a machine's exonode carries its own state slot and effect list. Both backends' records have
     *  them; declaring them is what lets a narrowed parent type place a machine. */
    state: unknown;
    effectStops: ((() => void) | null)[] | null;
    transitionOverrides: TExoTransitionOverrides | null;
    serviceState: unknown;
}

const TAG_SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('span', { class: 'tag' }, (span) => {
        label = span.textPort();
    });
    return { label };
});

const mTag = createExoMachineBuilder<TExoMachineNode>(TAG_SCHEMA);
const PT = TAG_SCHEMA.ports;

/** THE ONE DOOR A TAG'S TEXT IS WRITTEN THROUGH, on its first fill and on every later one — a
 *  machine takes no props, so the value arrives as a transition argument. */
export const writeTagLabel = mTag.transition((c: TExoMachineNode, text: string) => {
    c.text(PT.label, text);
});

export const TAG = mTag.done();

/** The conditional block. NO PORTS AND NO STATE: every byte of it is known at declaration, so the
 *  machine is bare — a component still carries both halves, even when the second has no work.
 *
 *  THE USERS DID NOT REACH IT AND THAT IS DELIBERATE: a card's user name is rendered by the CARD, in
 *  a span that stands whether the card is open or shut, so forty of the eighty cards would otherwise
 *  have hidden their shared read half the time. */
const DETAILS_SCHEMA = createExoSchema((b) => {
    b.el('div', { class: 'details' }, (d) => d.text('details…'));
    return {};
});

export const DETAILS = createExoMachineBuilder<TExoMachineNode>(DETAILS_SCHEMA).done();
