// THE SUITE'S SIDE OF THE APP SPECIFICATION: the two DOM helpers every participant is exercised with,
// and the handle they all return. The SCENE — every constant and every pure function of the 10-deck
// / 80-card app — lives in `apps/scene/spec.ts` and is re-exported below, so nothing that already
// says `import { IDX } from './todo-spec'` has to change. Its prose is in `apps/scene/spec.md`.
export {
    CARDS,
    IDX,
    POOL,
    startsOpen,
    startCount,
    nextCount,
    TITLES,
    titleOf,
    TITLE_CLIP,
    headlineOf,
    tagsLabel,
    expandedOf,
    USERS,
    USER_IDX,
    USER_NAMES,
    userNameOf,
    CHARS_MIN,
    CHARS_SPAN,
    startChars,
    nextChars,
    cardUserOf,
    tagUserOf,
    roundUserOf,
    tagTextOf,
    tagsOfCard,
    DECKS,
    DECK_IDX,
    CARDS_PER_DECK,
    cardsOfDeck,
    deckOfCard,
    DECK_TITLES,
    deckNameOf,
    startDeckName,
    nextDeckName,
    deckUserOf,
    deckDateOf,
    DAYS_SHORT,
    DAYS_LONG,
    MONTHS_SHORT,
    MONTHS_LONG,
    dateTextOf,
    type TTag,
} from '../apps/scene/spec';

/** A fresh bench container, ATTACHED to the document — mounting into a detached node is not the
 *  same work, and layout-affecting insertions are what a real mount pays for. */
export const el = (): HTMLElement => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    return c;
};

/** Fire a real bubbling click at every matching element. Every participant's `flip` is built out of
 *  this, so no framework is handed a cheaper path into its own event system than another.
 *
 *  IT RUNS INSIDE A CLOCK ON `exodra-app-update` AND NOWHERE ELSE among the app axes: a profile put
 *  `MouseEvent` + `dispatchEvent` + this function at ~61% of `app-update`'s round — identical work
 *  for every participant and therefore work that could rank nobody — so that axis drives handlers
 *  through `card-driver.ts` instead and uses this only in its GATES. */
export const clickAll = (c: HTMLElement, sel: string): void => {
    const btns = c.querySelectorAll(sel);
    for (let i = 0; i < btns.length; i++) {
        btns[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
};

/** What every participant's mount returns. */
export interface AppHandle {
    /** ONE UPDATE ROUND — every deck's `.ren`, every card's `.tog`, every card's `.addtag`, then the
     *  app's own round operation (`roundUserOf(round++)`'s setting advanced once) — COMMITTED to the
     *  DOM by the time it returns. THE ORDER IS PART OF THE CONTRACT: the end state does not depend
     *  on it and the amount of work does, which is the one difference a byte gate cannot see. Step 4
     *  has no button and must be THE SAME closure the participant declares to `noteRoundOp`. See
     *  `apps/scene/spec.md`. */
    flip: () => void;
    teardown: () => void;
    /** HOW THIS PARTICIPANT COMMITS A BATCH SYNCHRONOUSLY — declared only by the participants that
     *  batch, read only by `app-update`. DECLARED BY THE PARTICIPANT AND NEVER INFERRED: an axis
     *  that decided for itself when somebody else's renderer had committed could stop a clock before
     *  the work was done. */
    commit?: (run: () => void) => void;
}
