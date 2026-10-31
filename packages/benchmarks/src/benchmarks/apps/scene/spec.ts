// THE APP SPECIFICATION: the numbers and the pure functions that define the 10-deck / 80-card todo
// app every participant implements. FRAMEWORK-FREE, AND IT HAS TO STAY SO — a participant BUILT ON
// ITS OWN (`bench/build/`) imports this file, and one framework import here would put React inside
// Angular's bundle. The prose, the scene's arguments and its refusals are in `spec.md`.

export const CARDS = 80;
export const IDX = Array.from({ length: CARDS }, (_, i) => i);

/** EVERY LABEL IS LONGER THAN EVERY USER SETTING (shortest `endpoint`, 8, against a maximum setting
 *  of 6), which is what makes `tagTextOf` a real clip on every tag at every setting. */
export const POOL = ['interface', 'endpoint', 'regression', 'profiling'];
export const startsOpen = (i: number): boolean => i % 2 === 0;
export const startCount = (i: number): number => (i % POOL.length) + 1;
export const nextCount = (c: number): number => (c % POOL.length) + 1;

/** Four, like `POOL`, so `i % length` cycles the same way `startCount` does. */
export const TITLES = [
    'Refactor the parser',
    'Ship the release notes',
    'Fix the flaky test',
    'Review the API surface',
];

export const titleOf = (i: number): string => `Task ${i}: ${TITLES[i % TITLES.length]}`;

/** EVERY title this spec produces is longer than this — the shortest is `Task 0: Fix the flaky
 *  test` at 26 characters — so no card gets a free ride through a toggle. */
export const TITLE_CLIP = 14;

export const headlineOf = (title: string, open: boolean): string =>
    open ? title : `${title.slice(0, TITLE_CLIP)}…`;

export const tagsLabel = (count: number): string => (count === 1 ? '1 tag' : `${count} tags`);

// THE RETURN TYPE IS THE TWO LITERALS AND NOT `string`, because React's and Solid's JSX both declare
// `aria-expanded` as `Booleanish`: typed as `string` every JSX participant needs an assertion, and an
// assertion is a place where a wrong value would pass silently.
export const expandedOf = (open: boolean): 'true' | 'false' => (open ? 'true' : 'false');

/** How many users the app has. Five against eighty cards and two hundred tags. */
export const USERS = 5;

// THE FIVE SETTINGS BELONG TO A MOUNTED APP AND NEVER TO A MODULE. Every gate mounts two apps side
// by side; shared module-level cells would advance each setting twice and both trees would still
// agree, so every byte gate would pass while the scene ran at double speed. Nothing here holds state.
export const USER_IDX = Array.from({ length: USERS }, (_, u) => u);

/** Distinct lengths and distinct first letters, so a card wired to the wrong user is a byte
 *  difference and not a coincidence. Rendered WHOLE — a setting clips TAG names, never these. */
export const USER_NAMES = ['Ada', 'Brendan', 'Grace', 'Linus', 'Margaret'];

export const userNameOf = (u: number): string => USER_NAMES[u];

/** FOUR settings — 3, 4, 5, 6 — because `count` already cycles with period 4 and `open` with 2, so
 *  the app's whole period stays `USERS × 4 = 20` and `app-update`'s 40-round region is exactly two
 *  cycles. A five-long ring would have made the period 100 and no timed region would have measured
 *  the same mixture twice. */
export const CHARS_MIN = 3;
export const CHARS_SPAN = 4;

export const startChars = (u: number): number => CHARS_MIN + (u % CHARS_SPAN);

export const nextChars = (c: number): number => ((c - CHARS_MIN + 1) % CHARS_SPAN) + CHARS_MIN;

export const cardUserOf = (i: number): number => i % USERS;

/** IT IS NOT THE CARD'S USER: `(i + j) % USERS` scatters one user's 40 tags across 40 DIFFERENT
 *  cards. `cardUserOf(i)` would have gathered a user's whole fan-out into sixteen subtrees and
 *  measured a subtree update wearing a shared write's name. */
export const tagUserOf = (i: number, j: number): number => (i + j) % USERS;

/** A ROTATION AND NOT A CONSTANT: with one permanently hot user the other four settings would be
 *  constants of the app, and a participant that noticed could hold their clipped labels for the life
 *  of the process and win the axis by spotting that the scene was rigged. */
export const roundUserOf = (round: number): number => round % USERS;

/** NO ELLIPSIS, unlike `headlineOf`: the setting IS "how many characters to show", so the text is
 *  exactly that many. Every label in `POOL` is longer than every setting. */
export const tagTextOf = (label: string, chars: number): string => label.slice(0, chars);

/** ONE TAG'S DATA: which name it carries and which user decides how much of it is shown. */
export interface TTag {
    readonly label: string;
    readonly user: number;
}

/** IT ALLOCATES FOUR OBJECTS PER CALL. A participant whose list reconciles BY OBJECT IDENTITY must
 *  call it ONCE PER CARD and slice the result, or every update hands the reconciler four rows it has
 *  never seen. A participant that re-renders a card from scratch calls it in the render body. */
export const tagsOfCard = (i: number): readonly TTag[] =>
    POOL.map((label, j) => ({ label, user: tagUserOf(i, j) }));

/** Ten, because five users divide it exactly — two decks each, no user a special case. */
export const DECKS = 10;

export const DECK_IDX = Array.from({ length: DECKS }, (_, d) => d);

/** `DECKS × CARDS_PER_DECK === CARDS`, which is the whole of the scale argument. */
export const CARDS_PER_DECK = CARDS / DECKS;

/** THE INDEX IS GLOBAL AND THAT IS THE POINT: a card's title, state, user and four tag users are all
 *  functions of `i`. A deck that renumbered its cards 0…7 would make every card one of eight kinds
 *  and quietly delete three quarters of the scene's variety. */
export const cardsOfDeck = (d: number): readonly number[] =>
    Array.from({ length: CARDS_PER_DECK }, (_, k) => d * CARDS_PER_DECK + k);

export const deckOfCard = (i: number): number => Math.floor(i / CARDS_PER_DECK);

/** Four, like `POOL` and like the setting ring, so nothing depends on two different periods. */
export const DECK_TITLES = ['Backlog', 'In review', 'Shipped', 'Archive'];

/** THE INDEX IS IN THE TEXT so that ten decks never render the same string: two of the ten share a
 *  title, and a participant that rendered deck 4's name into deck 8 would pass the byte gate. */
export const deckNameOf = (d: number, name: number): string => `${DECK_TITLES[name]} ${d}`;

export const startDeckName = (d: number): number => d % DECK_TITLES.length;

export const nextDeckName = (name: number): number => (name + 1) % DECK_TITLES.length;

export const deckUserOf = (d: number): number => d % USERS;

/** MODULE-LEVEL AND SAFE, unlike the five settings: nothing ever writes to a `Date` here, so two
 *  apps standing side by side in a gate share twelve frozen facts rather than pieces of state. */
const DECK_DATES = Array.from(
    { length: 12 },
    (_, k) => new Date(Date.UTC(2024, k, 2 + k, 8 + k, (5 * k) % 60, (7 * k) % 60))
);

/** `d % 12` so an axis that renders more decks than the app has (`hydrate-floor` renders eighty)
 *  still gets a date for every one. */
export const deckDateOf = (d: number): Date => DECK_DATES[d % 12];

/** The whole of the format, so nothing depends on a runtime's locale data. Index = `getUTCDay()` /
 *  `getUTCMonth()`. */
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_LONG = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];
export const MONTHS_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];
export const MONTHS_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** IT USES `getUTC*` AND NEVER `Intl`: a byte gate diffs `innerHTML`, and `Intl` output depends on
 *  the ICU data of whatever runtime the axis is run under. `detail` is the same number a tag reads
 *  as a character count — four precisions over the ring 3…6, each containing the one before. */
export const dateTextOf = (date: Date, detail: number): string => {
    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    if (detail <= CHARS_MIN) return `${day} ${MONTHS_SHORT[month]} ${year}`;
    const weekday = date.getUTCDay();
    const head = `${DAYS_SHORT[weekday]} ${day} ${MONTHS_SHORT[month]} ${year}`;
    if (detail === CHARS_MIN + 1) return head;
    const hours = pad2(date.getUTCHours());
    const minutes = pad2(date.getUTCMinutes());
    if (detail === CHARS_MIN + 2) return `${head} ${hours}:${minutes}`;
    return (
        `${DAYS_LONG[weekday]} ${day} ${MONTHS_LONG[month]} ${year} ` +
        `${hours}:${minutes}:${pad2(date.getUTCSeconds())}`
    );
};
