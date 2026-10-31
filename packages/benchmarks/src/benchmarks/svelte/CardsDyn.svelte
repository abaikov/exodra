<script lang="ts">
  import DeckDyn from './DeckDyn.svelte';
  import {
    USER_IDX,
    CARDS_PER_DECK,
    startChars,
    nextChars,
    roundUserOf,
  } from '../shared/todo-spec';
  let { cards = 80 }: { cards?: number } = $props();
  const decks = Array.from({ length: cards / CARDS_PER_DECK }, (_, d) => d);
  // `$state` AND NOT `$state.raw`: Svelte proxies an array PER INDEX, so `chars[u] = …` wakes only
  // the tags of user `u`; a raw array replaced wholesale wakes every card that reads any setting.
  let chars = $state(USER_IDX.map(startChars));
  let round = 0;
  // Exported because the round's third step is not a click and has no button (`AppHandle.flip`):
  // Svelte 5's `mount()` returns a component's exports, and that is how `todo-app.tsx` calls this.
  export function advanceUser() {
    const u = roundUserOf(round);
    round++;
    chars[u] = nextChars(chars[u]);
  }
</script>

<!-- THE INDENTATION HERE IS SAFE AND THE INDENTATION IN `CardDyn.svelte` IS NOT, and the
     difference is worth stating because the two files look like they break the same rule.
     `clean_nodes` REMOVES a fragment's leading and trailing whitespace-only text and only
     COLLAPSES the whitespace BETWEEN two nodes. Every whitespace run below is leading or
     trailing — of the `.app` div's fragment, or of the each-block's — because each fragment
     holds exactly one node. A card's fragment holds seven, so six of its runs are between
     nodes and survive as spaces; that is why that file writes its markup with none. -->
<div class="app">
  {#each decks as d (d)}
    <DeckDyn {d} {chars} />
  {/each}
</div>
