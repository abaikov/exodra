import type { TExoEventHandler } from '@exodra/core';
import type { TExoTermRegion } from './TExoTermChild';
import type { TExoTermEvent } from '../../utilities/types/TExoTermEvent';

// A text tree has no event system, so a listener is merely RECORDED and `exoTermFire` runs it. The
// subject is kept beside the handler because it is the handler's second argument.
export type TExoTermListener = {
    readonly handler: TExoEventHandler<TExoTermEvent, TExoTermElement>;
    readonly subject: unknown;
};

// The very same object is SHARED by every instance of a schema: nothing ever writes it.
export type TExoTermStaticText = {
    readonly text: string;
};

export type TExoTermKid = TExoTermElement | TExoTermStaticText | TExoTermRegion;

// A LIVE OBJECT, NOT A SNAPSHOT: a bound port writes into it again on every change. `attrs` is
// keyed by MARKUP SPELLING (a port the schema calls `className` lands under `class`), and is
// null-prototype because its keys come from a wiring function. `text` keeps the schema's
// `content !== null` distinction: "no text port" and "one never filled" print differently.
export type TExoTermElement = {
    readonly tag: string;
    // An absent key is an absent attribute.
    readonly attrs: Record<string, string>;
    text: string | null;
    readonly kids: TExoTermKid[];
    readonly listeners: Record<string, TExoTermListener>;
};
