<script lang="ts">
  export let i = 0;
  export let open = false;
  export let count = 1;
  const POOL = ['ui', 'api', 'bug', 'perf'];
  $: tags = POOL.slice(0, count);
  const cycle = () => (count = (count % POOL.length) + 1);
</script>

<div class="card" data-i={i}>
  <h3>Task {i}</h3>
  <button class="tog" on:click={() => (open = !open)}>details</button>
  {#if open}<div class="details">details…</div>{/if}
  <div class="tags">
    {#each tags as t (t)}<span class="tag">{t}</span>{/each}
  </div>
  <button class="addtag" on:click={cycle}>+</button>
</div>
