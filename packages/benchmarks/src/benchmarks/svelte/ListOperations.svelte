<script lang="ts">
  let items: string[] = [];
  
  function addItem(item: string) {
    items = [...items, item];
  }
  
  function reset() {
    items = [];
  }
  
  // Expose methods for benchmark
  export { addItem, reset };
</script>

<ul>
  {#each items as item}
    <li>{item}</li>
  {/each}
</ul>







