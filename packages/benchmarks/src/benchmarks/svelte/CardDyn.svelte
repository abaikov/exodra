<script lang="ts">
  import {
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    nextCount,
    tagsOfCard,
    tagTextOf,
    userNameOf,
    cardUserOf,
  } from '../shared/todo-spec';
  import { noteCardOps } from '../shared/card-driver';

  // `chars` is NOT seeded into local state like `open`/`count`: it is the app's, it moves without
  // this card, and reading the prop is what subscribes this card's tags to it.
  let { i = 0, chars = [], open: initialOpen = false, count: initialCount = 1 }:
    { i?: number; chars?: number[]; open?: boolean; count?: number } = $props();
  let open = $state(initialOpen);
  let count = $state(initialCount);
  const title = titleOf(i);
  const userName = userNameOf(cardUserOf(i));
  // `pool` IS BUILT ONCE: `{#each … (t.label)}` keys by the label, and rebuilding four objects per
  // click would hand the keyed block rows it has never seen.
  const pool = tagsOfCard(i);
  const tags = $derived(pool.slice(0, count));
  const headline = $derived(headlineOf(title, open));
  const expanded = $derived(expandedOf(open));
  const label = $derived(tagsLabel(count));
  const tog = () => (open = !open);
  const cycle = () => (count = nextCount(count));
  noteCardOps(tog, cycle);
  // NO WHITESPACE BETWEEN TAGS AT ALL: Svelte COLLAPSES a whitespace-only text between two nodes to
  // one space, so a newline in front of a `<` puts a space back into all 80 cards.
</script>

<div class="card" data-i={i}
><h3>{headline}</h3
><span class="user">{userName}</span
><button class="tog" aria-expanded={expanded} onclick={tog}>details</button
>{#if open}<div class="details">details…</div>{/if}<div class="tags"
>{#each tags as t (t.label)}<span class="tag">{tagTextOf(t.label, chars[t.user])}</span>{/each}</div
><span class="count">{label}</span
><button class="addtag" onclick={cycle}>+</button
></div>
