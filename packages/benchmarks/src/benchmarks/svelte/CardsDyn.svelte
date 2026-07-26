<script lang="ts">
  import CardDyn from './CardDyn.svelte';
  export let cards = 80;
  let items = Array.from({ length: cards }, (_, i) => i);
</script>

<div class="app">
  {#each items as i (i)}
    <CardDyn {i} open={i % 2 === 0} count={(i % 4) + 1} />
  {/each}
</div>
