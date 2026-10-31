// The React app of `react.tsx`, written in JSX so a JSX compiler has something to compile. Same
// hooks, same keys, same attribute order; gated byte for byte against the same reference.
import { useState } from 'react';

import {
    startsOpen,
    startCount,
    nextCount,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    USER_IDX,
    userNameOf,
    startChars,
    cardUserOf,
    tagTextOf,
    tagsOfCard,
    DECK_IDX,
    cardsOfDeck,
    deckNameOf,
    startDeckName,
    nextDeckName,
    deckUserOf,
    deckDateOf,
    dateTextOf,
} from '../scene/spec';
import { noteCardOps, noteDeckOps } from '../../shared/card-driver';

function ReactCard({ i, chars }) {
    const [open, setOpen] = useState(startsOpen(i));
    const [count, setCount] = useState(startCount(i));
    const tags = tagsOfCard(i).slice(0, count);
    const user = userNameOf(cardUserOf(i));
    const headline = headlineOf(titleOf(i), open);
    const expanded = expandedOf(open);
    const label = tagsLabel(count);
    const tog = () => {
        setOpen((o) => !o);
    };
    const addTag = () => {
        setCount(nextCount);
    };
    noteCardOps(tog, addTag);
    return (
        <div className="card" data-i={String(i)}>
            <h3>{headline}</h3>
            <span className="user">{user}</span>
            <button className="tog" aria-expanded={expanded} onClick={() => setOpen((o) => !o)}>
                details
            </button>
            {open ? <div className="details">details…</div> : null}
            <div className="tags">
                {tags.map((t) => (
                    <span key={t.label} className="tag">
                        {tagTextOf(t.label, chars[t.user])}
                    </span>
                ))}
            </div>
            <span className="count">{label}</span>
            <button className="addtag" onClick={() => setCount(nextCount)}>
                +
            </button>
        </div>
    );
}

function ReactDeck({ d, chars }) {
    const [name, setName] = useState(startDeckName(d));
    const author = deckUserOf(d);
    const rename = () => {
        setName(nextDeckName);
    };
    noteDeckOps(rename);
    return (
        <div className="deck">
            <h2>{deckNameOf(d, name)}</h2>
            <span className="author">{userNameOf(author)}</span>
            <time className="date">{dateTextOf(deckDateOf(d), chars[author])}</time>
            <button className="ren" onClick={rename}>
                rename
            </button>
            <div className="cards">
                {cardsOfDeck(d).map((i) => (
                    <ReactCard key={i} i={i} chars={chars} />
                ))}
            </div>
        </div>
    );
}

export function ReactJsxApp({ slot }) {
    const [decks] = useState(DECK_IDX);
    const [chars, setChars] = useState(() => USER_IDX.map(startChars));
    slot.value = setChars;
    return (
        <div className="app">
            {decks.map((d) => (
                <ReactDeck key={d} d={d} chars={chars} />
            ))}
        </div>
    );
}
