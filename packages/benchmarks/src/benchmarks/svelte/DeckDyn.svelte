<script lang="ts">
  import CardDyn from './CardDyn.svelte';
  import {
    cardsOfDeck,
    deckUserOf,
    deckDateOf,
    deckNameOf,
    startDeckName,
    nextDeckName,
    dateTextOf,
    userNameOf,
    startsOpen,
    startCount,
  } from '../shared/todo-spec';
  import { noteDeckOps } from '../shared/card-driver';

  let { d = 0, chars = [] }: { d?: number; chars?: number[] } = $props();
  const author = deckUserOf(d);
  const authorName = userNameOf(author);
  const when = deckDateOf(d);
  // The list is fixed — a deck never gains or loses a card — so this is a `const`, not a `$derived`.
  const own = cardsOfDeck(d);
  let name = $state(startDeckName(d));
  const heading = $derived(deckNameOf(d, name));
  const date = $derived(dateTextOf(when, chars[author]));
  const rename = () => (name = nextDeckName(name));
  noteDeckOps(rename);
  // Svelte COLLAPSES whitespace between two elements to a single space rather than dropping it, so
  // a newline in front of a `<` puts a text node into all ten decks: every markup line begins `>`.
</script>

<div class="deck"
><h2>{heading}</h2
><span class="author">{authorName}</span
><time class="date">{date}</time
><button class="ren" onclick={rename}>rename</button
><div class="cards"
>{#each own as i (i)}<CardDyn {i} {chars} open={startsOpen(i)} count={startCount(i)} />{/each}</div
></div>
