<svelte:options accessors />

<script lang="ts">
  export let show = false;
  
  function toggle() {
    show = !show;
  }
  
  // Expose toggle method for benchmark
  export { toggle };
</script>

<div>
  {#if show}
    <div>
      {#each Array.from({ length: 50 }, (_, i) => i) as i}
        <div>Item {i}</div>
      {/each}
    </div>
  {/if}
</div>



