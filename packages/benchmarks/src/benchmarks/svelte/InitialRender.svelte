<script lang="ts">
  // Large component tree with many nodes
  // Using 200 divs with 3 nested divs each = ~800 DOM nodes (reasonable for benchmark)
</script>

<div data-test="large-component">
  {#each Array.from({ length: 200 }, (_, i) => i) as i}
    <div data-id={String(i)}>
      <span>Item {i}</span>
      <div>
        {#each Array.from({ length: 3 }, (_, j) => j) as j}
          <div data-nested={`${i}-${j}`}>
            Nested {i}-{j}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>





